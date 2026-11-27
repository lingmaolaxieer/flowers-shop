/**
 * 蓝牙 TSPL 便携打印机封装。
 * 需真机调试：TSPL 便携打印机
 * （小程序模拟器无蓝牙能力，请在真机上测试并确认设备已开机、处于可被发现状态）
 */

interface PrintOptions {
  /** 设备名称关键字，默认 TSPL */
  deviceNameKeyword?: string;
  /** 已知服务 UUID（可选，自动发现时可省略） */
  serviceUuid?: string;
  /** 已知可写特征值 UUID（可选，自动发现时可省略） */
  writeCharacteristicUuid?: string;
  /** 标签宽度（毫米） */
  widthMm?: number;
  /** 标签高度（毫米） */
  heightMm?: number;
}

interface BleDevice {
  deviceId: string;
  name?: string;
  localName?: string;
}

type WxApi = (options: any) => void;

function wxCall<T>(api: WxApi, options: Record<string, unknown> = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    api({
      ...options,
      success: (res: T) => resolve(res),
      fail: (err: { errMsg?: string }) => reject(new Error(err.errMsg || '蓝牙操作失败')),
    });
  });
}

/** 字符串 → UTF-8 ArrayBuffer（兼容中文标签内容） */
function toArrayBuffer(text: string): ArrayBuffer {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  bytes.forEach((byte, index) => {
    view[index] = byte;
  });
  return buffer;
}

/** 生成 TSPL 指令：设置标签尺寸、清屏、打印追溯码 */
export function buildTspl(text: string, options: PrintOptions = {}): string {
  const width = options.widthMm ?? 50;
  const height = options.heightMm ?? 30;
  const safeText = text.replace(/["\r\n]/g, ' ');
  return [
    `SIZE ${width} mm,${height} mm`,
    'GAP 3 mm,0 mm',
    'CLS',
    `TEXT 10,10,"3",0,1,1,"${safeText}"`,
    'PRINT 1,1',
    '',
  ].join('\r\n');
}

function discoverDevice(keyword: string): Promise<BleDevice> {
  return new Promise((resolve, reject) => {
    const onFound = (res: any) => {
      const devices = (res?.devices || []) as BleDevice[];
      const match = devices.find((d) =>
        `${d.name || ''}${d.localName || ''}`.toUpperCase().includes(keyword.toUpperCase()),
      );
      if (match) {
        clearTimeout(timer);
        wx.offBluetoothDeviceFound(onFound);
        resolve(match);
      }
    };
    const timer = setTimeout(() => {
      wx.offBluetoothDeviceFound(onFound);
      reject(new Error('未发现蓝牙打印机，请确认设备已开机且名称包含 TSPL'));
    }, 8000);

    wx.onBluetoothDeviceFound(onFound);
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => undefined,
      fail: (err) => {
        clearTimeout(timer);
        wx.offBluetoothDeviceFound(onFound);
        reject(new Error(err.errMsg || '启动蓝牙扫描失败'));
      },
    });
  });
}

async function findWritableCharacteristic(
  deviceId: string,
  serviceUuid?: string,
  characteristicUuid?: string,
): Promise<{ serviceId: string; characteristicId: string }> {
  if (serviceUuid && characteristicUuid) {
    return { serviceId: serviceUuid, characteristicId: characteristicUuid };
  }
  const serviceRes = await wxCall<{ services: Array<{ uuid: string }> }>(
    wx.getBLEDeviceServices,
    { deviceId },
  );
  for (const service of serviceRes.services || []) {
    const charRes = await wxCall<{
      characteristics: Array<{ uuid: string; properties: { write: boolean } }>;
    }>(wx.getBLEDeviceCharacteristics, { deviceId, serviceId: service.uuid });
    const writable = (charRes.characteristics || []).find((c) => c.properties.write);
    if (writable) {
      return { serviceId: service.uuid, characteristicId: writable.uuid };
    }
  }
  throw new Error('未找到可写蓝牙特征值');
}

/** 发送标签打印指令；失败时抛出可读错误，由调用方 showToast 提示 */
export async function printLabel(text: string, options: PrintOptions = {}): Promise<void> {
  let deviceId = '';
  let connected = false;
  try {
    await wxCall(wx.openBluetoothAdapter);
    const device = await discoverDevice(options.deviceNameKeyword ?? 'TSPL');
    deviceId = device.deviceId;
    await wxCall(wx.createBLEConnection, { deviceId, timeout: 5000 });
    connected = true;
    wx.stopBluetoothDevicesDiscovery({});

    const { serviceId, characteristicId } = await findWritableCharacteristic(
      deviceId,
      options.serviceUuid,
      options.writeCharacteristicUuid,
    );

    const buffer = toArrayBuffer(buildTspl(text, options));
    const chunkSize = 20;
    for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
      const chunk = buffer.slice(offset, Math.min(offset + chunkSize, buffer.byteLength));
      await wxCall(wx.writeBLECharacteristicValue, {
        deviceId,
        serviceId,
        characteristicId,
        value: chunk,
      });
    }
    wx.showToast({ title: '标签已发送', icon: 'success' });
  } catch (err: any) {
    throw new Error(err?.message || '打印失败');
  } finally {
    if (connected) wx.closeBLEConnection({ deviceId });
    wx.closeBluetoothAdapter({});
  }
}
