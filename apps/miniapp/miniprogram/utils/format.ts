/**
 * 金额格式化：后端金额统一以「分」存储，展示时转为元。
 */
export function formatFen(fen: number | undefined | null): string {
  const value = Number(fen ?? 0);
  return (value / 100).toFixed(2);
}
