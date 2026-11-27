/** 打印标签数据 */
export interface PrintLabel {
  code: string;
  productName: string;
  unit: string;
  qty: number;
}

/** 打印结果 */
export interface PrintResult {
  success: boolean;
  message: string;
}

/** Provider token：由具体打印实现（Mock / 真机）绑定 */
export const PRINTER_SERVICE = 'PRINTER_SERVICE';

/**
 * 打印能力抽象（不可实现项，按约定提供可替换 Provider + Mock 实现）。
 * 真机接入时新增实现并在 Module 中替换 PRINTER_SERVICE 的绑定即可。
 */
export abstract class PrinterService {
  abstract printLabels(labels: PrintLabel[]): Promise<PrintResult>;
}
