import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShipmentStatus, Status } from '@flower/shared';
import { DeliveryArea } from '../../database/entities/delivery-area.entity';
import { DeliveryFeeRule } from '../../database/entities/delivery-fee-rule.entity';
import { DeliveryPerson } from '../../database/entities/delivery-person.entity';
import { DeliveryStatusLog } from '../../database/entities/delivery-status-log.entity';
import { Shipment } from '../../database/entities/shipment.entity';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { CreateDeliveryAreaDto } from './dto/create-delivery-area.dto';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { QuoteFeeDto } from './dto/quote-fee.dto';
import { UpdateDeliveryAreaDto } from './dto/update-delivery-area.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';

/** 配送费试算结果，字段单位均为整数分。 */
export interface FeeQuote {
  baseFee: number;
  weightFee: number;
  amountSurcharge: number;
  freeThresholdApplied: boolean;
  finalFee: number;
}

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryArea) private readonly areaRepo: Repository<DeliveryArea>,
    @InjectRepository(DeliveryFeeRule) private readonly ruleRepo: Repository<DeliveryFeeRule>,
    @InjectRepository(Shipment) private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(DeliveryPerson) private readonly personRepo: Repository<DeliveryPerson>,
    @InjectRepository(DeliveryStatusLog) private readonly statusLogRepo: Repository<DeliveryStatusLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 配送费试算（核心）。
   * 费用 = 区域基础费 + 重量费(weightFeePerKg * weight) + 金额加价(orderAmount * amountSurchargeRatio)；
   * 若 orderAmount >= freeThreshold 则整单免配，finalFee = 0。
   * 配置在试算时从 delivery_areas / delivery_fee_rules 实时读取，改配置立即生效。
   * 公开下单页无 scope 时以 areaId 为锚点定位租户，再用该区域的 tenant/supplier 取规则。
   */
  async quoteFee(scope: RequestScope | undefined, params: QuoteFeeDto): Promise<FeeQuote> {
    const areaWhere: Record<string, unknown> = { id: params.areaId, status: Status.ENABLED };
    if (scope?.tenantId) areaWhere.tenantId = scope.tenantId;
    if (scope?.supplierId) areaWhere.supplierId = scope.supplierId;

    const area = await this.areaRepo.findOne({ where: areaWhere });
    if (!area) throw new NotFoundException('配送区域不存在或已停用');

    const rule = await this.ruleRepo.findOne({
      where: {
        tenantId: area.tenantId,
        supplierId: area.supplierId,
        method: params.method,
        status: Status.ENABLED,
      },
      order: { createdAt: 'ASC' },
    });
    if (!rule) throw new NotFoundException('未配置该配送方式的配送费规则');

    const orderAmount = Math.max(0, Number(params.orderAmount) || 0);
    const weight = Math.max(0, Number(params.weight) || 0);
    const baseFee = Math.round(Number(area.baseFee) || 0);
    const weightFee = Math.round(Number(rule.weightFeePerKg || 0) * weight);
    const amountSurcharge = Math.round(orderAmount * Number(rule.amountSurchargeRatio || 0));
    const threshold = area.freeThreshold == null ? null : Math.round(Number(area.freeThreshold));
    const freeThresholdApplied = threshold !== null && orderAmount >= threshold;
    const finalFee = freeThresholdApplied ? 0 : baseFee + weightFee + amountSurcharge;

    return { baseFee, weightFee, amountSurcharge, freeThresholdApplied, finalFee };
  }

  // ---------- 配送区域 ----------

  async listAreas(scope: RequestScope) {
    const areas = await this.areaRepo.find({
      where: this.scopeWhere(scope),
      order: { createdAt: 'DESC' },
    });
    return areas.map((a) => this.toAreaVO(a));
  }

  async getArea(id: string, scope: RequestScope) {
    return this.toAreaVO(await this.getAreaEntity(id, scope));
  }

  async createArea(scope: RequestScope, dto: CreateDeliveryAreaDto) {
    const supplierId = this.requireSupplierId(scope);
    const area = await this.areaRepo.save(
      this.areaRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        name: dto.name,
        rangeDesc: dto.rangeDesc,
        baseFee: dto.baseFee,
        freeThreshold: dto.freeThreshold,
        status: dto.status ?? Status.ENABLED,
      }),
    );
    return this.toAreaVO(area);
  }

  async updateArea(id: string, scope: RequestScope, dto: UpdateDeliveryAreaDto) {
    const area = await this.getAreaEntity(id, scope);
    if (dto.name !== undefined) area.name = dto.name;
    if (dto.rangeDesc !== undefined) area.rangeDesc = dto.rangeDesc;
    if (dto.baseFee !== undefined) area.baseFee = dto.baseFee;
    if (dto.freeThreshold !== undefined) area.freeThreshold = dto.freeThreshold;
    if (dto.status !== undefined) area.status = dto.status;
    const saved = await this.areaRepo.save(area);
    return this.toAreaVO(saved);
  }

  // ---------- 运单 ----------

  async createShipment(scope: RequestScope, dto: CreateShipmentDto) {
    const supplierId = this.requireSupplierId(scope);
    const shipment = await this.shipmentRepo.save(
      this.shipmentRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        shopId: dto.shopId,
        orderId: dto.orderId,
        method: dto.method,
        trackingNo: dto.trackingNo,
        eta: dto.eta ? new Date(dto.eta) : undefined,
        status: ShipmentStatus.PENDING,
        weight: dto.weight,
        feeBreakdown: dto.feeBreakdown,
      }),
    );
    return this.toShipmentVO(shipment);
  }

  async updateTracking(id: string, scope: RequestScope, dto: UpdateTrackingDto) {
    const shipment = await this.shipmentRepo.findOne({ where: this.scopeWhere(scope, { id }) });
    if (!shipment) throw new NotFoundException('运单不存在或无权操作');
    shipment.trackingNo = dto.trackingNo;
    if (dto.eta) shipment.eta = new Date(dto.eta);
    if (dto.status) shipment.status = dto.status;
    const saved = await this.shipmentRepo.save(shipment);
    return this.toShipmentVO(saved);
  }

  /** 配送员更新状态：运单状态与状态流水在同一事务内落库。 */
  async updateStatusByOrder(
    orderId: string,
    scope: RequestScope,
    operatorId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const shipmentRepo = manager.getRepository(Shipment);
      const logRepo = manager.getRepository(DeliveryStatusLog);
      const shipment = await shipmentRepo.findOne({ where: this.scopeWhere(scope, { orderId }) });
      if (!shipment) throw new NotFoundException('该订单运单不存在或无权操作');

      shipment.status = dto.status;
      const saved = await shipmentRepo.save(shipment);
      const log = await logRepo.save(
        logRepo.create({
          tenantId: shipment.tenantId,
          supplierId: shipment.supplierId,
          shopId: shipment.shopId,
          shipmentId: shipment.id,
          status: dto.status,
          operatorId,
          note: dto.note,
        }),
      );
      return { shipment: this.toShipmentVO(saved), logId: log.id };
    });
  }

  // ---------- 配送员 ----------

  async listPersons(scope: RequestScope) {
    const persons = await this.personRepo.find({
      where: this.scopeWhere(scope),
      order: { createdAt: 'DESC' },
    });
    return persons.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name ?? null,
      phone: p.phone ?? null,
      status: p.status,
    }));
  }

  async createPerson(scope: RequestScope, dto: CreateDeliveryPersonDto) {
    const supplierId = this.requireSupplierId(scope);
    const person = await this.personRepo.save(
      this.personRepo.create({
        tenantId: scope.tenantId,
        supplierId,
        userId: dto.userId,
        name: dto.name,
        phone: dto.phone,
        status: dto.status ?? Status.ENABLED,
      }),
    );
    return { id: person.id, userId: person.userId, name: person.name ?? null, phone: person.phone ?? null, status: person.status };
  }

  // ---------- 内部辅助 ----------

  private scopeWhere(scope: RequestScope, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      tenantId: scope.tenantId,
      ...(scope.supplierId ? { supplierId: scope.supplierId } : {}),
      ...extra,
    };
  }

  private requireSupplierId(scope: RequestScope): string {
    if (!scope.supplierId) throw new BadRequestException('请在批发商身份下操作配送配置');
    return scope.supplierId;
  }

  private async getAreaEntity(id: string, scope: RequestScope): Promise<DeliveryArea> {
    const area = await this.areaRepo.findOne({ where: this.scopeWhere(scope, { id }) });
    if (!area) throw new NotFoundException('配送区域不存在或无权操作');
    return area;
  }

  private toAreaVO(area: DeliveryArea) {
    return {
      id: area.id,
      name: area.name,
      rangeDesc: area.rangeDesc ?? null,
      baseFee: area.baseFee,
      freeThreshold: area.freeThreshold ?? null,
      status: area.status,
    };
  }

  private toShipmentVO(shipment: Shipment) {
    return {
      id: shipment.id,
      tenantId: shipment.tenantId,
      supplierId: shipment.supplierId,
      shopId: shipment.shopId,
      orderId: shipment.orderId,
      method: shipment.method,
      trackingNo: shipment.trackingNo ?? null,
      eta: shipment.eta ?? null,
      status: shipment.status,
      weight: shipment.weight ?? null,
      feeBreakdown: shipment.feeBreakdown ?? null,
    };
  }
}
