import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface JsCodeSessionResponse {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信平台能力适配层。
 * WX_MOCK_LOGIN=true 时走本地模拟，无需真实 AppID 即可完成 M1 自测。
 * 需人工配置：WX_APPID / WX_APPSECRET（小程序后台获取）。
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger('WechatService');
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly mockLogin: boolean;
  private accessTokenCache?: { token: string; expireAt: number };

  constructor(private readonly config: ConfigService) {
    this.appId = this.config.get<string>('app.wechat.appId') ?? '';
    this.appSecret = this.config.get<string>('app.wechat.appSecret') ?? '';
    this.mockLogin = this.config.get<boolean>('app.wechat.mockLogin') ?? true;
  }

  /** wx.login 的 code 换取 openid */
  async getOpenidByCode(code: string): Promise<{ openid: string; unionid?: string }> {
    if (this.mockLogin) {
      // 模拟：code 即为用户标识，便于本地多账号自测
      return { openid: `mock_openid_${code}` };
    }

    const { data } = await axios.get<JsCodeSessionResponse>(
      'https://api.weixin.qq.com/sns/jscode2session',
      {
        params: {
          appid: this.appId,
          secret: this.appSecret,
          js_code: code,
          grant_type: 'authorization_code',
        },
        timeout: 8000,
      },
    );

    if (data.errcode || !data.openid) {
      throw new Error(`微信登录失败: [${data.errcode}] ${data.errmsg ?? '未返回 openid'}`);
    }
    return { openid: data.openid, unionid: data.unionid };
  }

  /**
   * 手机号快速验证（wx.getPhoneNumber 返回 code）。
   * 需人工配置：小程序后台开通「手机号快速验证」组件（已认证主体）。
   */
  async resolvePhoneByCode(code: string): Promise<string> {
    if (this.mockLogin) return '13800138000';

    const token = await this.getAccessToken();
    const { data } = await axios.post<{
      errcode?: number;
      errmsg?: string;
      phone_info?: { phoneNumber?: string };
    }>(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`,
      { code },
      { timeout: 8000 },
    );

    if (data.errcode !== 0 || !data.phone_info?.phoneNumber) {
      throw new Error(`手机号获取失败: [${data.errcode}] ${data.errmsg ?? ''}`);
    }
    return data.phone_info.phoneNumber;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessTokenCache && this.accessTokenCache.expireAt > Date.now()) {
      return this.accessTokenCache.token;
    }
    const { data } = await axios.get<{
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
    }>('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: this.appId,
        secret: this.appSecret,
      },
      timeout: 8000,
    });
    if (!data.access_token) {
      throw new Error(`获取 access_token 失败: [${data.errcode}] ${data.errmsg ?? ''}`);
    }
    this.accessTokenCache = {
      token: data.access_token,
      expireAt: Date.now() + ((data.expires_in ?? 7200) - 300) * 1000,
    };
    this.logger.log('已刷新微信 access_token');
    return data.access_token;
  }
}
