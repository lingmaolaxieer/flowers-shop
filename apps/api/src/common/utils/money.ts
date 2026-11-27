/** 金额工具：所有金额以整数分（BIGINT）存储，展示时再转元。 */

export const yuanToFen = (yuan: number): number => Math.round(yuan * 100);

export const fenToYuan = (fen: number): number => fen / 100;

export const formatFen = (fen: number): string => `¥${(fen / 100).toFixed(2)}`;
