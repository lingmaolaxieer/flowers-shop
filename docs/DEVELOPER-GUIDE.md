# 二次开发说明

## 一、代码结构

```
flower-wholesale/
├── apps/api/src/
│   ├── main.ts                 # 入口：全局前缀 /api/v1、ValidationPipe、CORS
│   ├── app.module.ts           # 根模块：注册所有业务模块 + 全局守卫/拦截器/过滤器
│   ├── common/                 # 横切：guards(JWT/Tenant/RBAC)、decorators、interceptors、filters、utils
│   ├── config/                 # 环境变量映射与校验（Joi）
│   ├── database/
│   │   ├── entities/           # 全部 TypeORM 实体（每表一文件）
│   │   ├── migrations/         # 版本化迁移（M1~M8）+ 等价裸 SQL
│   │   └── seeds/              # 种子数据（角色/权限/配置/测试账号）
│   ├── modules/
│   │   ├── auth/ shop/ role/ user/ supplier/          # M1 账号权限
│   │   ├── product/ price/ inventory/                 # M2 商品价库
│   │   ├── order/                                     # M3 订单状态机
│   │   ├── qrcode/                                    # M4 二维码出货
│   │   ├── payment/ settlement/                       # M5 支付结算
│   │   ├── delivery/ notification/                    # M6 配送通知
│   │   ├── marketing/                                 # M7 营销
│   │   ├── reconciliation/ report/                    # M8 对账报表
│   │   └── integration/                               # 可替换抽象层（见下）
│   └── jobs/                   # 定时任务（超时取消/对账生成）
├── apps/miniapp/miniprogram/    # 微信原生小程序（TS）
├── apps/admin/src/              # Vue3 Web 管理端
├── packages/shared/src/         # 前后端共享枚举/常量（enums.ts / constants.ts）
└── docs/                        # 设计、API、自测、验收、部署文档
```

## 二、共享契约（@flower/shared）

`packages/shared/src/enums.ts` 定义所有状态码、角色码、权限点、业务枚举；`constants.ts` 定义 `PROFIT_SHARE_MAX_RATIO=0.3` 等关键常量。

**修改流程**：改完 shared → `npm run build:shared` → 小程序 `miniprogram/constants/index.ts` 同步对应值（小程序不直接依赖 npm 包，用本地常量镜像）。后端 import from `@flower/shared`。

## 三、可替换抽象层（不可实现项的接入点）

| 抽象 | 接口文件 | Mock 实现 | 替换为真实实现的步骤 |
|---|---|---|---|
| 支付 | `modules/integration/payment/payment.service.ts` | `mock-payment.service.ts` | 实现 prepay/verifyCallback/refund；用微信支付 v3 SDK（如 `wechatpay-node-v3`）；配置 APIv3 密钥/证书；改注入 Provider token |
| 分账 | `modules/integration/payment/profit-share.service.ts` | `mock-profit-share.service.ts` | 实现 share/rollback/query；微信分账 API；注意冻结期与 180 天回退窗口；接收方需人工添加 |
| 打印 | `modules/integration/printer/printer.service.ts` | `mock-printer.service.ts` | 端侧 `miniprogram/utils/bluetooth.ts` 用 BLE 写 TSPL 指令；真机调试 |
| 通知/语音 | `modules/integration/notification/notification.service.ts` | `mock-notification.service.ts` | 订阅消息用微信 `subscribeMessage.send`；语音用 Web Speech API/服务端 TTS |
| 对象存储 | `modules/integration/storage/`（如启用） | LocalStorageService | 配置 COS/OSS SDK；填 `.env` 密钥 |

替换方式：在对应 Module 的 providers 里把 Mock Provider 换成真实实现（`{ provide: XxxService, useClass: RealXxxService }`），业务代码无需改动。

## 四、常见修改场景

### 1. 调整店家确认超时时长
改 `.env` 的 `ORDER_CONFIRM_TIMEOUT_MINUTES`（M3 定时任务读取），无需改代码。

### 2. 调整分账上限比例
`packages/shared/src/constants.ts` 的 `PROFIT_SHARE_MAX_RATIO` 与 `system_configs.profit_share_max_ratio` 保持一致。**注意**：这是监管红线，默认 0.3，不建议上调；超过部分走人工结算。

### 3. 新增商品单位
`enums.ts` 的 `ProductUnit` 加枚举值 → 重建 shared → 同步小程序常量。SKU 的 unit 列是 MySQL enum，需新增 migration 执行 `ALTER TABLE ... MODIFY COLUMN unit ENUM(...)`。

### 4. 新增角色/权限点
在 seed 脚本的 `ROLE_PERMISSIONS` 与 `enums.ts` 的 `RoleCode/PermCode` 加值 → 重新 seed 或写增量 migration → 用 RBAC 装饰器 `@RequiresPerm` 保护接口。

### 5. 新增报表
在 `enums.ts` 的 `ReportType` 加类型 → `report/report.service.ts` 的 `query()` 增加分支（QueryBuilder 聚合）→ 前端报表下拉加选项。

### 6. 修改抽成维度规则
`commission-rule.entity.ts` 的 `dimension` + `commission.service.ts` 的计算逻辑；规则数据由管理端配置，无需改代码即可调比例/优先级/互斥组。

## 五、多租户与价格隔离的实现要点（务必保持）

1. `TenantGuard` 从 JWT 生成 scope 并剥离客户端伪造的 tenant/supplier/shop 字段；所有 Service 查询必须带 scope 条件。
2. 顾客端接口（`/products`、`/orders` 等顾客视角）在 Service 层用**白名单 DTO** map 返回，只含 `retailPrice`，绝不含 `wholesalePrice/price/cost`。新增顾客接口时沿用此模式。
3. 写接口带 `Idempotency-Key`（`idempotency_keys` 表）防重复提交。

## 六、数据库迁移规范

- 禁止 `synchronize: true`。
- 新功能 → 新建 migration 文件（递增时间戳）→ `npm run migration:run`。
- 每个 migration 提供 `up`/`down`，并附等价裸 SQL 便于审计。
- 字段变更写在 migration，不要手改实体后指望自动同步。

## 七、本地开发命令速查

```bash
npm install                       # 安装依赖（Monorepo workspaces）
npm run build:shared              # 构建共享包
npm run dev:api                   # API 热更新（localhost:3000）
npm run dev:admin                 # 管理端热更新（Vite 代理 /api → 3000）
docker compose up -d mysql redis  # 启动基础设施
npm run migration:run             # 执行迁移
npm run seed                      # 初始化数据
```
