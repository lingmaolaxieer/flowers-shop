import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QrCodeStatus } from '@flower/shared';
import { Repository } from 'typeorm';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { computeSignature, getQrSignSecret, signCode } from '../../common/utils/signing';
import { QrCode } from '../../database/entities/qr-code.entity';
import { QrCodeQueryDto } from './dto/qr-code-query.dto';

export interface GenerateQrItem {
  productId: string;
  qty: number;
  unitSeqStart?: number;
}

@Injectable()
export class QrCodeService {
  constructor(
    @InjectRepository(QrCode) private readonly qrRepo: Repository<QrCode>,
    private readonly config: ConfigService,
  ) {}

  /**
   * 一单位一码：为每个商品按 qty 生成连续单位序号的防伪二维码并批量入库。
   * 编码 = 订单号 + 商品ID + 单位序号 + HMAC-SHA256 签名。
   */
  async generateQrCodes(
    scope: RequestScope,
    orderId: string,
    items: GenerateQrItem[],
  ): Promise<{ generated: number; codes: string[] }> {
    const total = items.reduce((sum, item) => sum + item.qty, 0);
    if (total <= 0) throw new BadRequestException('生成数量必须大于 0');
    if (total > 1000) throw new BadRequestException('单次生成数量不能超过 1000');

    const secret = getQrSignSecret(this.config);
    // M3 集成点：订单模块落地后，此处应反查订单真实 shopId/supplierId；
    // 当前先以 scope 为准，避免客户端伪造租户字段。
    const supplierId = scope.supplierId ?? '0';
    const shopId = scope.shopId ?? '0';

    const entities: QrCode[] = [];
    for (const item of items) {
      const start = item.unitSeqStart ?? 1;
      for (let seq = start; seq < start + item.qty; seq += 1) {
        const signature = computeSignature(orderId, item.productId, seq, secret);
        entities.push(
          this.qrRepo.create({
            tenantId: scope.tenantId,
            supplierId,
            shopId,
            orderId,
            productId: item.productId,
            unitSeq: seq,
            code: signCode(orderId, item.productId, seq, secret),
            signature,
            status: QrCodeStatus.ACTIVE,
          }),
        );
      }
    }

    await this.qrRepo.save(entities, { chunk: 200 });
    return { generated: entities.length, codes: entities.map((e) => e.code) };
  }

  /** 二维码列表（严格按 scope 过滤） */
  async list(scope: RequestScope, query: QrCodeQueryDto) {
    const where: Record<string, unknown> = { tenantId: scope.tenantId };
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.shopId) where.shopId = scope.shopId;
    if (query.orderId) where.orderId = query.orderId;
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.qrRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { total, page, pageSize, items };
  }
}
