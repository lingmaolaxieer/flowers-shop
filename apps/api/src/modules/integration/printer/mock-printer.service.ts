import { Injectable } from '@nestjs/common';
import { PrintLabel, PrintResult, PrinterService } from './printer.service';

/**
 * 打印机 Mock 实现：仅输出 TSPL 指令到控制台，不连接真实设备。
 * 需真机调试：TSPL 便携打印机蓝牙连接，端侧实现见小程序 utils/bluetooth.ts。
 */
@Injectable()
export class MockPrinterService extends PrinterService {
  async printLabels(labels: PrintLabel[]): Promise<PrintResult> {
    const lines: string[] = ['SIZE 50 mm,30 mm', 'GAP 3 mm,0 mm', 'CLS'];
    for (const label of labels) {
      lines.push(
        `TEXT 10,10,"3",0,1,1,1,"${label.productName}"`,
        `TEXT 10,50,"3",0,1,1,1,"${label.code}"`,
        `TEXT 10,90,"3",0,1,1,1,"${label.qty}${label.unit}"`,
        'PRINT 1',
      );
    }
    console.log('[MockPrinterService] TSPL 指令:\n' + lines.join('\n'));
    return { success: true, message: `模拟打印 ${labels.length} 张标签（未连接真机）` };
  }
}
