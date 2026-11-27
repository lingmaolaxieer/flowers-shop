import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  AfterSaleType,
  DeliveryMethod,
  OrderMessageType,
  OrderStatus,
  OrderType,
  PayStatus,
  PermCode,
  RefundType,
  RoleCode,
} from '@flower/shared';
import { JwtPayload, RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { AfterSale } from '../../database/entities/after-sale.entity';
import { Order } from '../../database/entities/order.entity';
import { OrderAddress } from '../../database/entities/order-address.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderMessage } from '../../database/entities/order-message.entity';
import { OrderStatusLog } from '../../database/entities/order-status-log.entity';
import { Refund } from '../../database/entities/refund.entity';
import { Shop } from '../../database/entities/shop.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';
import { InventoryService } from '../inventory/inventory.service';
import { AfterSaleDto } from './dto/after-sale.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.dto';
import {
  OrderAdminVo,
  OrderCustomerVo,
  toAdminVo,
  toCustomerVo,
} from './dto/order.vo';
import { AFTER_SALE_TARGET, assertOrderTransition } from './order-state-machine';

/** 订单默认确认超时（分钟），可由 system_configs.order_confirm_timeout_minutes 覆盖 */
const DEFAULT_CONFIRM_TIMEOUT_MINUTES = 30;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusLog) private readonly logRepo: Repository<OrderStatusLog>,
    @InjectRepository(OrderMessage) private readonly messageRepo: Repository<OrderMessage>,
    @InjectRepository(OrderAddress) private readonly addressRepo: Repository<OrderAddress>,
    @InjectRepository(Refund) private readonly refundRepo: Repository<Refund>,
    @InjectRepository(AfterSale) private readonly afterSaleRepo: Repository<AfterSale>,
    @InjectRepository(SystemConfig) private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(Shop) private readonly shopRepo: Repository<Shop>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
  ) {}

  // ==================== 创建 / 查询（顾客端） ====================

  /** 创建订单：事务内落库 + 锁库存 + 写初始状态日志 */
  async create(user: JwtPayload, scope: RequestScope, dto: CreateOrderDto): Promise<OrderCustomerVo> {
    if (!['delivery', 'pickup'].includes(dto.address.type)) {
      throw new BadRequestException('地址类型只能是 delivery 或 pickup');
    }

    const shop = await this.shopRepo.findOne({
      where: { id: dto.shopId, tenantId: scope.tenantId },
    });
    if (!shop) throw new NotFoundException('花店不存在或无权下单');

    const supplierId = scope.supplierId ?? shop.supplierId;
    const orderType: OrderType =
      user.roleCode === RoleCode.SHOP_MANAGER || user.roleCode === RoleCode.SHOP_STAFF
        ? OrderType.SHOP
        : OrderType.CUSTOMER;

    // 顾客单按零售价计价，店家单按批发价计价；运费/优惠当前为 0，由 M5/M7 回填
    const unitPrice = (item: CreateOrderItemDto): number =>
      orderType === OrderType.CUSTOMER ? item.retailPrice : item.wholesalePrice;
    const goodsAmount = dto.items.reduce((sum, item) => sum + unitPrice(item) * item.qty, 0);
    const payableAmount = goodsAmount;
    const confirmDeadline = new Date(Date.now() + (await this.getConfirmTimeoutMinutes()) * 60_000);

    // InventoryService.lockStock 内部自带事务，不能嵌在订单事务里：
    // 先落主单拿 ID → 锁库存（失败则取消主单并回滚已锁库存）→ 再补明细/地址/日志
    const createdOrder = await this.orderRepo.save(
      this.orderRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        shopId: dto.shopId,
        orderNo: this.generateNo('OD'),
        orderType,
        buyerUserId: user.sub,
        status: OrderStatus.PENDING_CONFIRM,
        payStatus: PayStatus.UNPAID,
        deliveryMethod: dto.deliveryMethod,
        goodsAmount,
        deliveryFee: 0,
        discountAmount: 0,
        payableAmount,
        confirmDeadline,
        remark: dto.remark ?? null,
      }),
    );

    try {
      for (const item of dto.items) {
        await this.inventoryService.lockStock(scope, item.skuId, item.qty, createdOrder.id);
      }
    } catch (error) {
      await this.orderRepo.update(
        { id: createdOrder.id, tenantId: scope.tenantId },
        { status: OrderStatus.CANCELLED, cancelReason: '库存锁定失败' },
      );
      try {
        await this.inventoryService.unlockStock(this.orderScope(createdOrder), createdOrder.id);
      } catch {
        // 没有成功锁定的库存，忽略释放失败
      }
      throw error;
    }

    const createdItems: OrderItem[] = [];
    await this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(OrderItem);
      for (const item of dto.items) {
        const saved = await itemRepo.save(
          itemRepo.create({
            tenantId: scope.tenantId,
            supplierId,
            shopId: dto.shopId,
            orderId: createdOrder.id,
            skuId: item.skuId,
            productName: item.productName ?? '',
            unit: item.unit ?? '',
            qty: item.qty,
            retailPrice: item.retailPrice,
            wholesalePrice: item.wholesalePrice,
          }),
        );
        createdItems.push(saved);
      }

      const addressRepo = manager.getRepository(OrderAddress);
      await addressRepo.save(
        addressRepo.create({
          tenantId: scope.tenantId,
          supplierId,
          shopId: dto.shopId,
          orderId: createdOrder.id,
          receiver: dto.address.receiver,
          phone: dto.address.phone,
          address: dto.address.address,
          type: dto.address.type,
          areaId: dto.address.areaId ?? null,
        }),
      );

      await this.writeLog(
        manager,
        createdOrder,
        null,
        OrderStatus.PENDING_CONFIRM,
        user.sub,
        '订单创建',
      );
    });

    return toCustomerVo(createdOrder, createdItems);
  }

  /** 我的订单：店家作用域看本店订单，个人作用域只看自己的订单 */
  async findMyOrders(
    userId: string,
    scope: RequestScope,
    query: ListOrdersQueryDto,
  ): Promise<{ total: number; page: number; pageSize: number; items: OrderCustomerVo[] }> {
    const where = this.buildScopeWhere(scope);
    if (scope.shopId) where.shopId = scope.shopId;
    else where.buyerUserId = userId;
    if (query.status) where.status = query.status;
    if (query.orderType) where.orderType = query.orderType;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const items = await this.loadItemsForOrders(orders.map((o) => o.id), scope.tenantId);
    return {
      total,
      page,
      pageSize,
      items: orders.map((o) => toCustomerVo(o, items.get(o.id) ?? [])),
    };
  }

  async findOne(id: string, user: JwtPayload, scope: RequestScope): Promise<OrderCustomerVo> {
    const order = await this.getOrderForUser(id, user, scope);
    return toCustomerVo(order, await this.loadItems(order));
  }

  // ==================== 状态流转（顾客端 / 店家） ====================

  /** 店家确认：pending_confirm → confirmed */
  async confirm(id: string, user: JwtPayload, scope: RequestScope) {
    return this.runTransition(id, user, scope, OrderStatus.CONFIRMED, '店家确认订单');
  }

  /** 取消：只允许未支付状态；取消后释放库存锁 */
  async cancel(id: string, user: JwtPayload, scope: RequestScope, dto: CancelOrderDto) {
    const order = await this.getOrderForUser(id, user, scope);
    await this.dataSource.transaction(async (manager) => {
      await this.transition(
        manager,
        order,
        OrderStatus.CANCELLED,
        user.sub,
        dto.reason ? `取消订单：${dto.reason}` : '取消订单',
        { cancelReason: dto.reason ?? null },
      );
    });
    try {
      await this.inventoryService.unlockStock(this.orderScope(order), order.id);
    } catch (error) {
      this.logger.error(`订单 ${order.id} 取消后释放库存锁失败`, error as Error);
    }
    return this.brief(order);
  }

  /**
   * 支付成功回调（供 M5 PaymentService 调用，无 HTTP 入口）。
   * pending_pay → paid，同步把 payStatus 置为 PAID。
   */
  async markPaid(orderId: string, scope: RequestScope, operatorId?: string) {
    const order = await this.orderRepo.findOne({
      where: this.buildScopeWhere(scope, { id: orderId }),
    });
    if (!order) throw new NotFoundException('订单不存在');
    await this.dataSource.transaction(async (manager) => {
      await this.transition(
        manager,
        order,
        OrderStatus.PAID,
        operatorId ?? null,
        '支付成功',
        { payStatus: PayStatus.PAID },
      );
    });
    return this.brief(order);
  }

  /** 接单：pending_accept → accepted（仅顾客单） */
  async accept(id: string, user: JwtPayload, scope: RequestScope) {
    return this.runTransition(id, user, scope, OrderStatus.ACCEPTED, '商家接单');
  }

  /** 拣货：顾客单 accepted → picking；店家单 paid → picking */
  async pick(id: string, user: JwtPayload, scope: RequestScope) {
    return this.runTransition(id, user, scope, OrderStatus.PICKING, '开始拣货');
  }

  /** 出货：picking → shipped（扫码触发的 HTTP 入口，M4 可复用） */
  async ship(id: string, user: JwtPayload, scope: RequestScope) {
    return this.runTransition(id, user, scope, OrderStatus.SHIPPED, '已出货');
  }

  /** 配送：shipped → delivering；自提单 shipped → pending_pickup */
  async deliver(id: string, user: JwtPayload, scope: RequestScope) {
    const order = await this.getOrderForUser(id, user, scope);
    const to =
      order.deliveryMethod === DeliveryMethod.PICKUP
        ? OrderStatus.PENDING_PICKUP
        : OrderStatus.DELIVERING;
    await this.dataSource.transaction(async (manager) => {
      await this.transition(manager, order, to, user.sub, '已配送/待自提');
    });
    return this.brief(order);
  }

  /** 完成：delivering / pending_pickup → completed */
  async complete(id: string, user: JwtPayload, scope: RequestScope) {
    return this.runTransition(id, user, scope, OrderStatus.COMPLETED, '订单完成');
  }

  // ==================== 售后 ====================

  /** 售后：退款 / 部分退款 / 缺货替换 / 价差。写 Refund、AfterSale 与状态日志。 */
  async afterSale(id: string, user: JwtPayload, scope: RequestScope, dto: AfterSaleDto) {
    const order = await this.getOrderForUser(id, user, scope);
    const to = AFTER_SALE_TARGET[dto.type];

    let amount = dto.amount ?? 0;
    if (dto.type === AfterSaleType.REFUND) amount = dto.amount ?? order.payableAmount;
    if (dto.type === AfterSaleType.PARTIAL_REFUND) {
      if (dto.amount === undefined) throw new BadRequestException('部分退款必须填写退款金额');
      amount = dto.amount;
    }
    if (
      (dto.type === AfterSaleType.PRICE_DIFF_PAY || dto.type === AfterSaleType.PRICE_DIFF_REFUND) &&
      dto.priceDiff === undefined
    ) {
      throw new BadRequestException('价差售后必须填写价差金额');
    }

    const payStatus =
      to === OrderStatus.REFUNDING
        ? PayStatus.REFUNDING
        : to === OrderStatus.PARTIAL_REFUNDED
          ? PayStatus.PARTIAL_REFUNDED
          : order.payStatus;

    await this.dataSource.transaction(async (manager) => {
      await this.transition(manager, order, to, user.sub, `售后发起：${dto.type}`, { payStatus });

      if (dto.type === AfterSaleType.REFUND || dto.type === AfterSaleType.PARTIAL_REFUND) {
        const refundRepo = manager.getRepository(Refund);
        await refundRepo.save(
          refundRepo.create({
            tenantId: order.tenantId,
            supplierId: order.supplierId,
            shopId: order.shopId,
            refundNo: this.generateNo('RF'),
            orderId: order.id,
            type: dto.type === AfterSaleType.REFUND ? RefundType.FULL : RefundType.PARTIAL,
            amount,
            reason: dto.reason ?? null,
            status: 'pending',
            inventoryStatus: null,
            profitShareRollbackStatus: null,
          }),
        );
      }

      const afterSaleRepo = manager.getRepository(AfterSale);
      await afterSaleRepo.save(
        afterSaleRepo.create({
          tenantId: order.tenantId,
          supplierId: order.supplierId,
          shopId: order.shopId,
          orderId: order.id,
          type: dto.type,
          priceDiff: dto.priceDiff ?? null,
          status: 'pending',
          operatorId: user.sub,
        }),
      );
    });
    return this.brief(order);
  }

  /** 售后完成：refunding / partial_refunded / replacement → after_sale_done */
  async finishAfterSale(id: string, user: JwtPayload, scope: RequestScope) {
    const order = await this.getOrderForUser(id, user, scope);
    const payStatus =
      order.status === OrderStatus.REFUNDING ? PayStatus.REFUNDED : order.payStatus;
    await this.dataSource.transaction(async (manager) => {
      await this.transition(
        manager,
        order,
        OrderStatus.AFTER_SALE_DONE,
        user.sub,
        '售后完成',
        { payStatus },
      );
      await manager.getRepository(AfterSale).update(
        { orderId: order.id, tenantId: order.tenantId, status: 'pending' },
        { status: 'done' },
      );
    });
    return this.brief(order);
  }

  // ==================== 留言 / 电话 / 客服 ====================

  async createMessage(id: string, user: JwtPayload, scope: RequestScope, dto: CreateMessageDto) {
    const order = await this.getOrderForUser(id, user, scope);
    if (dto.type === OrderMessageType.TEXT && !dto.content) {
      throw new BadRequestException('文字留言必须填写 content');
    }
    if (dto.type === OrderMessageType.PHONE && !dto.phone) {
      throw new BadRequestException('电话入口必须填写 phone');
    }
    const message = await this.messageRepo.save(
      this.messageRepo.create({
        tenantId: order.tenantId,
        supplierId: order.supplierId,
        shopId: order.shopId,
        orderId: order.id,
        senderId: user.sub,
        type: dto.type,
        content: dto.content ?? null,
        phone: dto.phone ?? null,
      }),
    );
    return {
      id: message.id,
      type: message.type,
      content: message.content ?? null,
      phone: message.phone ?? null,
      senderId: message.senderId,
      createdAt: message.createdAt,
    };
  }

  async listMessages(id: string, user: JwtPayload, scope: RequestScope) {
    const order = await this.getOrderForUser(id, user, scope);
    const messages = await this.messageRepo.find({
      where: { orderId: order.id, tenantId: order.tenantId },
      order: { createdAt: 'ASC' },
    });
    return messages.map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content ?? null,
      phone: m.phone ?? null,
      senderId: m.senderId,
      createdAt: m.createdAt,
    }));
  }

  // ==================== 后台管理 ====================

  async adminList(
    scope: RequestScope,
    query: ListOrdersQueryDto,
  ): Promise<{ total: number; page: number; pageSize: number; items: OrderAdminVo[] }> {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (query.status) where.status = query.status;
    if (query.orderType) where.orderType = query.orderType;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const items = await this.loadItemsForOrders(
      orders.map((o) => o.id),
      scope.tenantId,
    );
    return {
      total,
      page,
      pageSize,
      items: orders.map((o) => toAdminVo(o, items.get(o.id) ?? [])),
    };
  }

  async adminDetail(id: string, scope: RequestScope): Promise<OrderAdminVo> {
    const where: Record<string, unknown> = { id, tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    const order = await this.orderRepo.findOne({ where });
    if (!order) throw new NotFoundException('订单不存在');
    return toAdminVo(order, await this.loadItems(order));
  }

  // ==================== 内部辅助 ====================

  private async getConfirmTimeoutMinutes(): Promise<number> {
    const config = await this.configRepo.findOne({
      where: { key: 'order_confirm_timeout_minutes' },
    });
    const minutes = config ? Number(config.value) : NaN;
    return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_CONFIRM_TIMEOUT_MINUTES;
  }

  private buildScopeWhere(
    scope: RequestScope,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId: scope.tenantId, ...extra };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;
    return where;
  }

  private orderScope(order: Order): RequestScope {
    return {
      tenantId: order.tenantId,
      supplierId: order.supplierId,
      shopId: order.shopId,
    };
  }

  private async getOrderForUser(
    id: string,
    user: JwtPayload,
    scope: RequestScope,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: this.buildScopeWhere(scope, { id }) });
    if (!order) throw new NotFoundException('订单不存在或无权访问');
    const isAdmin =
      user.perms?.includes(PermCode.ORDER_READ) === true ||
      user.perms?.includes(PermCode.ORDER_WRITE) === true;
    if (
      !isAdmin &&
      order.buyerUserId !== user.sub &&
      scope.shopId !== order.shopId
    ) {
      throw new ForbiddenException('无权访问该订单');
    }
    return order;
  }

  private async runTransition(
    id: string,
    user: JwtPayload,
    scope: RequestScope,
    to: OrderStatus,
    note: string,
    extra?: Partial<Order>,
  ) {
    const order = await this.getOrderForUser(id, user, scope);
    await this.dataSource.transaction(async (manager) => {
      await this.transition(manager, order, to, user.sub, note, extra);
    });
    return this.brief(order);
  }

  /** 状态机校验 + 落库 + 状态日志，必须在事务内调用 */
  private async transition(
    manager: EntityManager,
    order: Order,
    to: OrderStatus,
    operatorId: string | null,
    note: string,
    extra?: Partial<Order>,
  ): Promise<void> {
    assertOrderTransition(order.orderType, order.status, to);
    const from = order.status;
    await manager.getRepository(Order).update(
      { id: order.id, tenantId: order.tenantId },
      { status: to, ...(extra ?? {}) },
    );
    await this.writeLog(manager, order, from, to, operatorId, note);
    order.status = to;
    if (extra) Object.assign(order, extra);
  }

  private async writeLog(
    manager: EntityManager,
    order: Order,
    from: OrderStatus | null,
    to: OrderStatus,
    operatorId: string | null,
    note?: string | null,
  ): Promise<void> {
    const logRepo = manager.getRepository(OrderStatusLog);
    await logRepo.save(
      logRepo.create({
        tenantId: order.tenantId,
        supplierId: order.supplierId,
        shopId: order.shopId,
        orderId: order.id,
        fromStatus: from,
        toStatus: to,
        operatorId: operatorId,
        note: note ?? null,
      }),
    );
  }

  private async loadItems(order: Order): Promise<OrderItem[]> {
    return this.itemRepo.find({
      where: { orderId: order.id, tenantId: order.tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  private async loadItemsForOrders(
    orderIds: string[],
    tenantId: string,
  ): Promise<Map<string, OrderItem[]>> {
    const map = new Map<string, OrderItem[]>();
    if (orderIds.length === 0) return map;
    const items = await this.itemRepo.find({
      where: { orderId: In(orderIds), tenantId },
      order: { createdAt: 'ASC' },
    });
    for (const item of items) {
      const list = map.get(item.orderId) ?? [];
      list.push(item);
      map.set(item.orderId, list);
    }
    return map;
  }

  private brief(order: Order) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      payStatus: order.payStatus,
    };
  }

  private generateNo(prefix: string): string {
    const random = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0');
    return `${prefix}${Date.now()}${random}`;
  }
}
