import { request } from '../../services/request';
import { printLabel } from '../../utils/bluetooth';

interface ScanResultVO {
  status?: string;
  result?: string;
  message?: string;
  productName?: string;
  code?: string;
}

type ScanResultType = '' | 'success' | 'duplicate' | 'antiFail';

Page({
  data: {
    scannedCode: '',
    batch: '',
    weight: '',
    loss: '',
    resultType: '' as ScanResultType,
    resultText: '',
    productName: '',
    submitting: false,
    printing: false,
  },

  onBatchInput(e: any) {
    this.setData({ batch: e.detail.value });
  },

  onWeightInput(e: any) {
    this.setData({ weight: e.detail.value });
  },

  onLossInput(e: any) {
    this.setData({ loss: e.detail.value });
  },

  onScan() {
    wx.scanCode({
      success: (res) => {
        const code = res.result || '';
        this.setData({ scannedCode: code, resultType: '', resultText: '' });
        if (!code) {
          wx.showToast({ title: '未识别到二维码', icon: 'none' });
          return;
        }
        void this.submitScan(code);
      },
      fail: () => {
        wx.showToast({ title: '已取消扫码', icon: 'none' });
      },
    });
  },

  async submitScan(code: string) {
    this.setData({ submitting: true });
    try {
      const data: Record<string, unknown> = { code };
      if (this.data.batch.trim()) data.batch = this.data.batch.trim();
      if (this.data.weight.trim()) data.weight = Number(this.data.weight);
      if (this.data.loss.trim()) data.loss = Number(this.data.loss);

      const res = await request<ScanResultVO>('/scan/scan', { method: 'POST', data });
      const raw = `${res?.status || res?.result || ''}`.toLowerCase();
      let resultType: ScanResultType = 'success';
      if (raw.includes('anti') || raw.includes('counterfeit')) {
        resultType = 'antiFail';
      } else if (raw.includes('duplicate') || raw.includes('repeat')) {
        resultType = 'duplicate';
      }
      this.setData({
        resultType,
        resultText: res?.message || (resultType === 'success' ? '出货成功' : resultType === 'duplicate' ? '重复扫码' : '防伪校验失败'),
        productName: res?.productName || '',
      });
    } catch (err: any) {
      this.setData({
        resultType: 'antiFail',
        resultText: err?.message || '扫码出货失败',
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async onPrint() {
    const code = this.data.scannedCode;
    if (!code) {
      wx.showToast({ title: '请先扫码', icon: 'none' });
      return;
    }
    this.setData({ printing: true });
    try {
      await printLabel(`${this.data.productName ? `${this.data.productName} ` : ''}${code}`);
    } catch (err: any) {
      wx.showToast({ title: `打印失败：${err?.message || '请检查设备'}`, icon: 'none' });
    } finally {
      this.setData({ printing: false });
    }
  },
});
