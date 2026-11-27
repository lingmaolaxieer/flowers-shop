import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

/**
 * 二维码防伪签名工具。
 * 编码格式：订单号-商品ID-单位序号-HMAC_SHA256签名
 * 签名原文：订单号|商品ID|单位序号（用 | 分隔，避免与编码中的 - 冲突）。
 * 任何字段或签名被篡改都会导致 verifyCode 返回 valid=false。
 */

/** 配置项名称（从环境变量读取） */
export const QR_SIGN_SECRET_KEY = 'QR_SIGN_SECRET';
/** 仅用于本地开发的默认值，生产环境必须配置 QR_SIGN_SECRET */
export const DEFAULT_QR_SIGN_SECRET = 'dev-only-qr-sign-secret-change-me';

export interface QrCodePayload {
  valid: boolean;
  orderNo: string;
  productId: string;
  unitSeq: number;
}

/** 从配置读取签名密钥；未配置时回退到开发默认值 */
export function getQrSignSecret(config: ConfigService): string {
  return config.get<string>(QR_SIGN_SECRET_KEY) ?? DEFAULT_QR_SIGN_SECRET;
}

/** 生成防伪签名（hex，64 位） */
export function computeSignature(
  orderNo: string,
  productId: string,
  unitSeq: number,
  secret: string,
): string {
  const payload = `${orderNo}|${productId}|${unitSeq}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** 生成完整编码：订单号-商品ID-单位序号-签名 */
export function signCode(
  orderNo: string,
  productId: string,
  unitSeq: number,
  secret: string,
): string {
  const signature = computeSignature(orderNo, productId, unitSeq, secret);
  return `${orderNo}-${productId}-${unitSeq}-${signature}`;
}

/** 拆分并校验编码；篡改任一字段或签名都会返回 valid=false */
export function verifyCode(code: string, secret: string): QrCodePayload {
  const invalid: QrCodePayload = { valid: false, orderNo: '', productId: '', unitSeq: 0 };
  if (typeof code !== 'string' || !code) return invalid;

  const sep = code.lastIndexOf('-');
  if (sep <= 0) return invalid;
  const body = code.slice(0, sep);
  const signature = code.slice(sep + 1);

  // 签名必须是 64 位 hex，否则 timingSafeEqual 无法安全比较
  if (!/^[0-9a-f]{64}$/i.test(signature)) return invalid;

  // 从右往左拆，兼容订单号本身含 '-' 的情况
  const parts = body.split('-');
  if (parts.length < 3) return invalid;
  const unitSeqRaw = parts.pop() as string;
  const productId = parts.pop() as string;
  const orderNo = parts.join('-');
  if (!orderNo || !productId) return invalid;

  const unitSeq = Number(unitSeqRaw);
  if (!Number.isInteger(unitSeq) || unitSeq <= 0 || String(unitSeq) !== unitSeqRaw) {
    return invalid;
  }

  const expected = computeSignature(orderNo, productId, unitSeq, secret);
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const matched =
    sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer);
  if (!matched) return invalid;

  return { valid: true, orderNo, productId, unitSeq };
}
