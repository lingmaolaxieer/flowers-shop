import { Workbook } from 'exceljs';

/** Excel 列定义。title 用中文；type=money 的列自动从分转成元。 */
export interface ExcelColumn {
  key: string;
  title: string;
  width?: number;
  type?: 'money' | 'number' | 'text';
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
}

/**
 * 由列定义 + 数据行生成 xlsx 二进制。
 * 金额数据内部仍以「分」传递，仅导出时 /100 显示为元。
 */
export async function buildExcelBuffer(sheets: ExcelSheet[]): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'flower-wholesale';
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.columns = sheet.columns.map((col) => ({
      header: col.title,
      key: col.key,
      width: col.width ?? 18,
    }));
    worksheet.getRow(1).font = { bold: true };

    for (const row of sheet.rows) {
      const values: Record<string, unknown> = {};
      for (const col of sheet.columns) {
        const raw = row[col.key];
        if (raw === null || raw === undefined) {
          values[col.key] = '';
          continue;
        }
        if (col.type === 'money') {
          const fen = Number(raw);
          values[col.key] = Number.isFinite(fen) ? fen / 100 : '';
        } else if (raw instanceof Date) {
          values[col.key] = raw.toISOString().slice(0, 19).replace('T', ' ');
        } else {
          values[col.key] = raw;
        }
      }
      worksheet.addRow(values);
    }

    sheet.columns.forEach((col, index) => {
      if (col.type === 'money') {
        worksheet.getColumn(index + 1).numFmt = '#,##0.00';
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as unknown as ArrayBuffer);
}

/** 生成安全的文件名（避免中文/特殊字符导致下载头异常） */
export function excelFilename(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${stamp}.xlsx`;
}
