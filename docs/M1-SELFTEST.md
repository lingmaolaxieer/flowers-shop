# M1 自测步骤

> 均为本地可复现步骤。Mock 登录模式下无需真实微信 AppID。

## 0. 环境准备

```bash
cd /Users/ryder.wang/WorkBuddy/2026-11-27-11-19-30

# 1) 启动 MySQL + Redis（也可使用本机已有服务，需同步 apps/api/.env）
docker compose up -d mysql redis

# 2) 安装依赖
npm install

# 3) 构建共享包（后端依赖其 dist）
npm run build:shared

# 4) 执行 M1 迁移
npm run migration:run

# 5) 灌入种子数据（角色/权限/配置/测试账号）
npm run seed

# 6) 启动后端
npm run dev:api
```

验证健康接口：
```bash
curl http://localhost:3000/api/v1/health
# 期望: {"code":0,"message":"ok","data":{"status":"ok",...}}
```

## 1. 数据库验证

```sql
SHOW TABLES;                          -- 应为 11 张表
SELECT COUNT(*) FROM permissions;     -- 20
SELECT COUNT(*) FROM roles;           -- 8
SELECT value FROM system_configs WHERE `key`='profit_share_max_ratio';  -- 0.3
SELECT openid, status FROM users;     -- 应含 admin_platform / admin_supplier
```

## 2. API 自测（curl）

> 若无 `jq`，可手动从响应中复制 token 到变量。

### 2.1 平台运营登录

```bash
PLATFORM_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/web-login \
  -H 'Content-Type: application/json' \
  -d '{"openid":"admin_platform"}' | jq -r '.data.token')
echo ${PLATFORM_TOKEN:0:40}
```

### 2.2 批发商管理员登录与身份

```bash
SUPPLIER_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/web-login \
  -H 'Content-Type: application/json' \
  -d '{"openid":"admin_supplier"}' | jq -r '.data.token')

curl -H "Authorization: Bearer $SUPPLIER_TOKEN" \
  http://localhost:3000/api/v1/auth/identities
# 期望: 含 roleCode=SUPPLIER_ADMIN 的身份
```

### 2.3 顾客登录并提交店家申请

```bash
CUSTOMER_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/wx-login \
  -H 'Content-Type: application/json' \
  -d '{"code":"shop001"}' | jq -r '.data.token')

curl -X POST http://localhost:3000/api/v1/shops/apply \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"芬芳花店","licenseNo":"91440101MA9XXXXXXX","contactPhone":"13800138000"}'
# 期望: auditStatus=pending，返回 shopId
```

### 2.4 平台审核列表 → 通过

```bash
curl -H "Authorization: Bearer $PLATFORM_TOKEN" \
  'http://localhost:3000/api/v1/admin/shop-audits?status=pending'

curl -X POST http://localhost:3000/api/v1/admin/shop-audits/1/approve \
  -H "Authorization: Bearer $PLATFORM_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"remark":"资料齐全"}'
# 期望: status=approved
```

### 2.5 审核后店主获得新身份

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/wx-login \
  -H 'Content-Type: application/json' -d '{"code":"shop001"}' | jq '.data.identities'
# 期望: 含 SHOP_MANAGER 身份

SHOP_MANAGER_ID=<从上一步复制 SHOP_MANAGER 身份的 id>
curl -X POST http://localhost:3000/api/v1/auth/switch-identity \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"identityId\":\"$SHOP_MANAGER_ID\"}"
# 期望: 返回新 token
```

### 2.6 权限与租户隔离反向测试

```bash
# a) 顾客访问审核列表 → 期望 403
curl -i -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  http://localhost:3000/api/v1/admin/shop-audits

# b) 客户端伪造 tenant_id → 期望 400（whitelist 拒绝）或被服务端剥离
curl -i -X POST http://localhost:3000/api/v1/shops/apply \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"伪造测试","licenseNo":"X","contactPhone":"13800138000","tenantId":"999"}'

# c) 无 token 访问受保护接口 → 期望 401
curl -i http://localhost:3000/api/v1/auth/profile
```

### 2.7 角色权限与子账号

```bash
curl -H "Authorization: Bearer $PLATFORM_TOKEN" http://localhost:3000/api/v1/admin/roles
curl -H "Authorization: Bearer $PLATFORM_TOKEN" http://localhost:3000/api/v1/admin/permissions
curl -H "Authorization: Bearer $PLATFORM_TOKEN" http://localhost:3000/api/v1/admin/suppliers
```

## 3. 小程序自测

1. 微信开发者工具导入 `apps/miniapp` 目录（AppID 可先用测试号；正式需人工提供）。
2. 修改 `apps/miniapp/miniprogram/constants/index.ts` 的 `BASE_URL` 为本机/测试域名。
3. 开发者工具勾选「不校验合法域名」（`project.config.json` 已设 `urlCheck=false`）。
4. 编译后依次验证：
   - 登录页「微信一键登录」→ 提示 `CUSTOMER` 身份；
   - 「我的」显示当前身份与身份数；
   - 「店家入驻申请」提交 → 显示「待审核」；
   - 平台 Web 端通过后，重新登录小程序 → 「切换身份」出现「店长」；
   - 切换后再次进入「我的」，身份显示为「店长」。

## 4. Web 管理端自测

```bash
npm run dev:admin
# 打开 http://localhost:5173
```

1. 登录页输入 `admin_platform` → 进入「店家审核」，可见小程序提交的申请，执行通过/驳回（驳回需填原因）。
2. 退出后输入 `admin_supplier` → 「批发商管理」仅见 `欣欣鲜花批发`。
3. 「角色权限」：查看 8 个预置角色 + 20 个权限点；尝试修改预置角色权限应被拒绝；新建自定义角色并分配权限成功。
4. 「店家审核」用批发商账号访问时仅见本 supplier 的申请。

## 5. 回滚（如需）

```bash
npm run migration:revert
```
