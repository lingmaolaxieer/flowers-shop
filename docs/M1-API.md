# M1 接口说明

**Base URL**：`http://localhost:3000/api/v1`（开发环境）

**统一成功响应**
```json
{ "code": 0, "message": "ok", "data": {}, "timestamp": 1730000000000 }
```

**统一错误响应**
```json
{ "code": "FORBIDDEN", "message": "权限不足，缺少: audit:write", "path": "/api/v1/admin/shop-audits", "timestamp": 1730000000000 }
```

**鉴权**：除标注 `@Public` 的接口外，均需 `Authorization: Bearer <token>`。
**租户隔离**：`tenant_id / supplier_id / shop_id` 一律从 JWT 读取；客户端传参会被 400 拒绝或强制剥离。

---

## 1. 健康检查

`GET /health` （公开）

```json
{ "code": 0, "data": { "status": "ok", "service": "flower-wholesale-api", "timestamp": 1730000000000 } }
```

---

## 2. 认证与身份

### 2.1 微信登录 `POST /auth/wx-login`（公开）

请求：
```json
{ "code": "test001" }
```
> `WX_MOCK_LOGIN=true` 时 code 任意；正式模式传 `wx.login()` 的 code。

响应：
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "currentIdentity": { "id": "1", "roleCode": "CUSTOMER", "tenantId": "1", "supplierId": null, "shopId": null },
    "identities": [ /* 同上结构，可多个 */ ]
  }
}
```

### 2.2 Web 内网测试登录 `POST /auth/web-login`（公开）

请求：
```json
{ "openid": "admin_platform" }
```
可用测试账号：`admin_platform`（平台运营）、`admin_supplier`（批发商管理员）。
响应同 2.1。**【需人工/二期】正式上线替换为小程序扫码授权登录。**

### 2.3 刷新令牌 `POST /auth/refresh-token`（公开）

请求：`{ "refreshToken": "eyJhbGciOi..." }` → 响应同 2.1。

### 2.4 绑定手机号 `POST /auth/bind-phone`

请求：`{ "code": "getPhoneNumber回调code" }`
响应：`{ "code": 0, "data": { "phone": "138****8000" } }`
> **需人工配置**：小程序后台开通「手机号快速验证」组件。

### 2.5 身份列表 `GET /auth/identities`

响应：`{ "code": 0, "data": [ { "id": "1", "roleCode": "CUSTOMER", ... } ] }`

### 2.6 切换身份 `POST /auth/switch-identity`

请求：`{ "identityId": "3" }`
响应：`{ "code": 0, "data": { "token": "新token(含新scope与权限)", "currentIdentity": {...} } }`
> 停用或未审核通过身份返回 403。

### 2.7 当前档案 `GET /auth/profile`

响应：`{ "code": 0, "data": { "id": "1", "phone": "138****8000", "status": 1 } }`

---

## 3. 店家与审核

### 3.1 提交入驻申请 `POST /shops/apply`

请求：
```json
{
  "name": "芬芳花店",
  "licenseNo": "91440101MA9XXXXXXX",
  "contactPhone": "13800138000",
  "licenseImage": "可选URL",
  "supplierId": "可选，不传则默认批发商"
}
```
响应：`{ "code": 0, "data": { "shopId": "5", "auditStatus": "pending" } }`

### 3.2 我的花店 `GET /shops/mine`

响应：`{ "code": 0, "data": [ { "id": "5", "name": "芬芳花店", "auditStatus": "pending", "licenseNo": "...", "contactPhone": "...", "settlementCycle": "month", "status": 1 } ] }`

### 3.3 花店详情 `GET /shops/:id`

需登录；仅返回同租户花店，否则 404。

### 3.4 审核列表 `GET /admin/shop-audits?status=pending` `权限: audit:read`

响应数据项：
```json
{
  "id": "1", "shopId": "5", "shopName": "芬芳花店",
  "licenseNo": "...", "licenseImage": null, "contactPhone": "...",
  "status": "pending", "auditRemark": null, "createdAt": "2026-11-27T03:00:00.000Z"
}
```

### 3.5 通过审核 `POST /admin/shop-audits/:id/approve` `权限: audit:write`

请求：`{ "remark": "资料齐全" }`（remark 可选）
效果：审核单 + 花店状态置 `approved`，并为店主创建 `SHOP_MANAGER` 身份（下次登录后可见）。

### 3.6 驳回审核 `POST /admin/shop-audits/:id/reject` `权限: audit:write`

请求：`{ "remark": "营业执照模糊" }`（**必填**）

---

## 4. 角色与权限

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/admin/roles` | `role:read` | 平台预置角色 + 本租户自定义角色 |
| POST | `/admin/roles` | `role:write` | 创建自定义角色，body: `{roleCode,name,scope}` |
| POST | `/admin/roles/:id/perms` | `role:write` | 分配权限，body: `{permCodes:["product:read"]}`；预置角色返回 403 |
| GET | `/admin/permissions` | `role:read` | 权限点字典（20 个） |

---

## 5. 子账号（staff）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/admin/staff` | `role:read` | 按租户/供应商/花店隔离的绑定列表 |
| POST | `/admin/staff` | `role:write` | body: `{openid,roleCode,supplierId?,shopId?}`，同步生成可切换身份 |
| PUT | `/admin/staff/:id/status` | `role:write` | body: `{status:1\|0}`，停用同步禁用身份 |

---

## 6. 批发商（多租户预留）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/admin/suppliers` | `supplier:read` | 平台看全部，批发商身份仅看自己 |
| POST | `/admin/suppliers` | `supplier:write` | body: `{name,contactName?,contactPhone?}`，自动创建独立租户 |
| PUT | `/admin/suppliers/:id/status` | `supplier:write` | body: `{status:1\|0}` |

---

## 7. 权限矩阵（M1 预置）

| 角色 | 关键权限 |
|---|---|
| 平台运营 | 全部 20 项 |
| 批发商管理员 | 商品/价格/库存/订单/财务/客服/二维码/导出/审核/角色/批发商 |
| 配货员 | 商品读、库存读写、订单读写、二维码打印、客服读 |
| 批发商客服 | 商品读、订单读写、客服读写、财务读 |
| 店长 | 商品读、价格读、库存读写、订单读写、财务读、导出、客服读写 |
| 店员 | 商品读、价格读、库存读、订单读写、客服读 |
| 顾客 | 商品读（**仅零售价**）、订单读、订单写 |
| 配送员 | 订单读、订单写 |

> 顾客角色不含任何 `:write` 管理权限；批发价字段由 M2 的价格脱敏拦截器保证不出现在顾客响应中。

---

## 8. 人工配置/真机调试标注

| 项 | 状态 | 说明 |
|---|---|---|
| 微信小程序 AppID/AppSecret | 需人工提供 | 未提供时 `WX_MOCK_LOGIN=true` 走模拟登录 |
| 手机号快速验证组件 | 需人工开通 | 小程序后台开通后 `bind-phone` 可用 |
| 营业执照真伪核验 | 需人工判断 | 系统只存证，审核通过/驳回由人操作 |
| Web 管理端扫码登录 | 二期/需人工 | 当前为内网 openid 测试登录 |
| 备案域名与 HTTPS | 需人工配置 | 小程序 request 合法域名、Web 生产反代 |
