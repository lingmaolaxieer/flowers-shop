# HANDOFF — Agent 交接摘要

> 本文供**接手的下一个 Agent** 阅读。目标是让你在 5 分钟内知道：这个项目是什么、已经做到哪一步、做了哪些非常规改动（以及为什么）、还剩什么、下一步具体该做什么。
> 最后更新：2026-11-27 14:00 (GMT+8)

---

## 0. 一句话状态

鲜花批发零售微信小程序（Monorepo）**M0–M9 全部里程碑已实现**，三端（shared / api / admin）类型检查零错误，并已在本机用 **SQLite 免 Docker 演示模式真实启动**、通过端到端冒烟测试。代码需推送到 `https://github.com/lingmaolaxieer/flowers-shop.git`（**当前卡在 GitHub 认证**，见第 9 节）。

---

## 1. 项目是什么

面向「鲜花批发商 → 花店（店家）→ 顾客」的 B2B2C 系统，含配送、结算、营销、对账报表。

**三端 + 共享包**

| 端 | 路径 | 技术 | 规模 |
|---|---|---|---|
| API | `apps/api` | NestJS 10 + TypeORM 0.3 + MySQL(生产)/SQLite(演示) | 18 模块 / 43 控制器 / **152 路由** / **73 实体** |
| 管理端 Web | `apps/admin` | Vue3 + Vite + Element Plus + Pinia | 13 个页面 |
| 小程序 | `apps/miniapp` | 微信原生小程序（无框架） | 12 个页面 |
| 共享包 | `packages/shared` | 枚举/常量/权限码 | 3 个源文件 |

全局 API 前缀：`/api/v1`（`main.ts` 统一设置）。

### 不可破坏的业务铁律（改动前务必确认）

1. **顾客端绝不可见批发价 / 成本价**：顾客接口一律经白名单 VO（`product-public.vo.ts`、`order/dto/order.vo.ts` 的 `toCustomerVo`），`wholesalePrice` 只允许出现在 Admin VO；小程序顾客页面禁止出现 `wholesalePrice`/`批发价`/`成本` 字样。
2. **金额一律整数「分」**（bigint / number），展示时才 ÷100 转元；人民币 ¥。
3. **微信分账比例 ≤ 30%**，超标强制拒绝并引导转人工结算（在「发起分账」与「切换分账模式」两处拦截）。
4. **一单位一码**：二维码 HMAC-SHA256 防伪签名 + 常量时间比较，扫码防重用唯一 `code` 约束。
5. **全表租户隔离**：`tenant_id` / `supplier_id` / `shop_id` + `RequestScope`，所有查询必须带租户条件。
6. 库存锁定用 `pessimistic_write` 行锁，库存不足直接抛错，**绝不超卖**；预警只能人工确认，禁止自动回补。

---

## 2. 已完成的里程碑

| 里程碑 | 内容 | 主要模块 / 迁移 |
|---|---|---|
| M0/M1 | 基座：多租户、RBAC、鉴权守卫、统一响应、审计、Shop/Supplier/User | `auth` `role` `user` `shop` `supplier` / `1700000000000-M1Init.ts` |
| M2 | 商品价库：商品/SKU/媒体、每日价/一店一价/等级价/阶梯价取价、库存/损耗/预警 | `product` `price` `inventory` / `...-M2Product.ts` |
| M3 | 订单状态机：创建→确认→拣货→发货→配送→完成、售后、留言、超时自动取消 | `order` / `...-M3Order.ts` |
| M4 | 二维码出货：批量生码、扫码防重防伪、离线同步幂等、打印抽象 | `qrcode` `integration/printer` / `...-M4Qrcode.ts` |
| M5 | 支付结算：预支付/回调幂等、退款路由、佣金规则、分账 30% 校验、对账单 | `payment` `settlement` `integration/payment` / `...-M5Payment.ts` |
| M6 | 配送通知：区域/运费试算、运单、配送状态流水、订阅消息/语音 Mock | `delivery` `notification` `integration/notification` / `...-M6Delivery.ts` |
| M7 | 营销 MVP：特价/预售/套餐/券/满减/会员价/起批量/积分 + 叠加互斥试算 | `marketing` / `...-M7Marketing.ts` |
| M8 | 对账报表：周期对账单生成/确认/审核/Excel 导出、8 类报表、审计日志、Webhook | `reconciliation` `report` / `...-M8Report.ts` |
| M9 | 文档与验收：使用规范、功能清单、部署、二开、上线检查清单、README | `docs/*.md` |

每个里程碑都有**两份等价迁移**：`170000000X-M*.ts`（TypeORM）+ `M*.sql`（裸 SQL，便于 DBA 审阅）。`data-source.ts` 用 glob 自动加载，新迁移无需手动注册。

完整功能矩阵与接口清单见 `docs/FEATURES.md`；按角色的操作说明见 `docs/USAGE-GUIDE.md` 与 `docs/OPERATIONS.md`。

---

## 3. 关键架构决策（不要轻易推翻）

- **统一响应**：`{ code, message, data }`，`code=0` 成功；全局 `ResponseInterceptor` + `HttpExceptionFilter`。Web 端 `api/request.ts` 拦截器自动解包 `data`；`responseType=blob` 时直接返回 `response.data`（文件导出用）。
- **Mock Provider 抽象**（真实能力未接前不改业务代码，只换 `useClass`）：

  | 能力 | 抽象 / Token | 当前实现 | 位置 |
  |---|---|---|---|
  | 支付 | `PAYMENT_SERVICE` (Symbol) | `MockPaymentService` | `modules/integration/payment/` |
  | 分账 | `PROFIT_SHARE_SERVICE` (Symbol) | `MockProfitShareService` | 同上 |
  | 通知 | `NOTIFICATION_SERVICE` (字符串常量) | `MockNotificationService` | `modules/integration/notification/` |
  | 打印 | `PRINTER_SERVICE` | `MockPrinterService` (TSPL) | `modules/integration/printer/` |

  `SettlementModule` 注册并导出支付/分账 Provider；`NotificationModule` 注册通知 Provider；`QrCodeModule` 注册打印 Provider。
- **`RequestScope` 租户上下文**：由 `TenantGuard` 从 JWT 注入。注意**顾客端接口没有加 `@Public()`**（`TenantGuard` 对公开接口不注入 scope 会导致隔离失效），与现有 shop 模块顾客接口保持一致，走登录后的 scope。
- **配置**：`apps/api/src/config/configuration.ts` 用 `registerAs('app', ...)`；`ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] })`；`env.validation.ts` 用 Joi 校验。
- **主键**：所有实体继承 `BaseEntity`，`id` 在 JS 侧用 `string` 承载避免 bigint 精度丢失。
- **金额单位分、状态用枚举字符串**，前端展示层统一格式化。

---

## 4. 本次会话（第二阶段）为「真正跑起来」所做的改动

> 这一节最重要：这些改动是**非常规适配**，主要为了在本机（无 Docker/MySQL/Redis）真实启动。生产 MySQL 路径不受影响。

| # | 改动 | 原因 |
|---|---|---|
| 1 | 补装 `@nestjs/platform-express@10` | **M1 就漏了这个依赖**，Nest 根本无法创建 HTTP 服务 |
| 2 | 补装 `better-sqlite3@11` | `sqlite3@5` 原生编译因 Python 3.12 移除 `distutils` 失败；TypeORM 原生支持 `better-sqlite3` 驱动 |
| 3 | `configuration.ts` 支持 `DB_TYPE=sqlite\|mysql` | sqlite 用 `type:'better-sqlite3'` + `synchronize:true` 自动建表；mysql 保持 `synchronize:false` 走 migration |
| 4 | `app.module.ts` 的 `TypeOrmModule.forRootAsync` 改为按配置展开 | 原来写死 mysql 参数 |
| 5 | `database/data-source.ts` 同步支持 sqlite（seed / migration 共用） | 否则 seed 连不上演示库 |
| 6 | **26 个实体 `type:'enum'` → `type:'simple-enum'`** | TypeORM 的 sqlite 驱动不支持原生 enum；simple-enum 在 MySQL migration 中仍是原生 ENUM，生产不受影响 |
| 7 | 给所有用 `length` 定义的字符串列显式补 `type:'varchar'` | `?: string \| null` 联合类型让设计期反射得到 `Object`，TypeORM 无法推断列类型（典型报错：`Shop.auditRemark`） |
| 8 | `BaseEntity` 主键类型按 `process.env.DB_TYPE` 动态选 `integer`/`bigint` | sqlite 的 `AUTOINCREMENT` 只允许 `INTEGER PRIMARY KEY`，bigint 会建表失败 |
| 9 | 启动命令改为 `npx ts-node -r dotenv/config src/main.ts` | **实体装饰器在 import 时求值，早于 Nest 加载 `.env`**；必须用 Node 预加载 dotenv 才能让 `DB_TYPE` 在实体加载前就位。同理 seed 也要 `-r dotenv/config` |
| 10 | `simple-enum` / 类型修复后同步全量编译验证 | 三端 0 错误 |
| 11 | 给 `settlement-statement` / `settlement-statement-item` 补报表字段（`statement_no`、`order_amount` 等）并**同步改两份 M5 迁移** | M8 模块比 M5 完成得晚，假设了更全的字段；不改会导致建表与实体不符 |
| 12 | `seed.ts` 补 `order_confirm_timeout_minutes` 配置项 | M3 超时服务读这个 key，而 seed 原本只写了 `customer_order_timeout_minutes`（两个都保留） |
| 13 | 装齐 `@nestjs/schedule`、`exceljs` | package.json 已声明但 node_modules 未安装，导致 tsc 连带报错 |
| 14 | Web 端 `api/request.ts` 拦截器修复 blob 下载 + `statement/index.vue` Blob 构造 | vue-tsc 报 2 处类型错误；axios 的 `use` 不接受泛型参数，改用类型断言 |
| 15 | 新建 `.gitignore` | 仓库原本没有，需排除 `node_modules`（含 `apps/admin/node_modules`）、`dist`、`*.sqlite*`、`.env`、`.workbuddy` |

另：`nest start` 会因清理 `dist` 触发本环境的删除保护，故演示统一用 `ts-node` 直接跑 `main.ts`。

---

## 5. 验证结果（已实测，非推测）

| 项 | 结果 |
|---|---|
| `npx tsc -p packages/shared/tsconfig.json` | ✅ 0 错误 |
| `npx tsc --noEmit -p apps/api/tsconfig.json` | ✅ 0 错误（全量） |
| `npx vue-tsc --noEmit`（apps/admin） | ✅ 0 错误 |
| `tsc -p apps/api/tsconfig.json` 产出 `dist/main.js` | ✅ 可部署 |
| DI 静态审查：`@InjectRepository(X)` 集合 ⊆ 各 Module `forFeature` 注册集合 | ✅ 差集为空，启动不会 DI 崩溃 |
| Nest 启动 | ✅ 152 路由全部映射，`Nest application successfully started` |
| 端到端冒烟 | ✅ `/api/v1/health` 200；`POST /auth/web-login` 返回 JWT；经 Vite 代理 (`5173 → 3000`) 带 Bearer 访问 `/admin/roles` 成功 |
| 顾客价格隔离（真实运行） | ✅ `GET /products` 响应 JSON 中无 `wholesalePrice` / `批发价`；小程序顾客页面零批发价字段 |
| 种子数据 | ✅ 2 租户、20 权限点、8 角色、系统配置（含 30% 上限）、2 个 Web 测试账号 |
| 演示业务数据 | ✅ 2 类目 + 6 商品（红玫瑰/白色郁金香/粉色洋桔梗/向日葵/尤加利叶/香槟玫瑰礼盒） |

---

## 6. 会话结束时的运行状态

| 服务 | 地址 | 启动方式 |
|---|---|---|
| API | `http://localhost:3000/api/v1` | `cd apps/api && npx ts-node -r dotenv/config src/main.ts`（后台） |
| Web 管理端 | `http://localhost:5173` | `cd apps/admin && npx vite --host 0.0.0.0`（后台） |
| 数据库 | `apps/api/demo.sqlite` | 首次启动 `synchronize` 自动建表 |
| 登录 openid | `admin_platform`（平台运营）、`admin_supplier`（批发商，有商品数据） | 内网 Mock 登录，无需微信 |

> ⚠️ 这些是本次会话的后台进程，会话结束后可能被回收。重新启动见 `docs/OPERATIONS.md`。
> `apps/api/.env` 中 `DB_TYPE=sqlite`、`SQLITE_PATH=demo.sqlite`；该文件被 `.gitignore` 排除，clone 后请从 `.env.example` 复制并按需修改。

---

## 7. 已知限制 / 未完成（按优先级）

### P0 — 必须人工介入
1. **GitHub 推送认证**：本机无 `gh` CLI、无 `GITHUB_TOKEN`、无 SSH key、无 credential helper；`git ls-remote` 对目标仓库要求输入用户名（私有仓库或尚未创建）。需用户提供 PAT 或先在 GitHub 建好仓库。
2. **生产 MySQL 端到端未验证**：本机无 Docker/MySQL/Redis，只做了编译 + DI 静态审查 + dist 产出三项等价验证。需在有 Docker 的机器跑一遍 `infra:up → migration:run → seed → dev:api`。
3. **微信能力全部走 Mock**：登录、支付 v3、分账、订阅消息、语音播报。需真实凭证（AppID/AppSecret、商户号/APIv3 密钥/证书、订阅模板 ID）。
4. **需初始化数据**：`delivery_fee_rules` 无启用规则时 `POST /delivery/quote` 返回 404；`notification_templates` 无模板时 `/admin/notifications/send` 返回 400。当前未提供管理接口，需手工 INSERT 或补接口。
5. **小程序未真机调试**：必须用微信开发者工具导入 `apps/miniapp`、填 AppID；蓝牙 TSPL 打印需真机验证。
6. 对象存储（`STORAGE_TYPE=local`）、生产密钥（JWT_SECRET / QR_SIGN_SECRET）需替换。

### P1 — 代码里的集成占位（业务闭环缺口）
| 位置 | 现状 | 应做 |
|---|---|---|
| `modules/qrcode/scan.service.ts` `notifyOrderShipped()` | 只打日志 | 注入 `OrderService`（用 `forwardRef`），调用 `markShipped(orderId, scope)` 把订单流转为 `SHIPPED` |
| `modules/qrcode/qr-code.service.ts` `generateQrCodes()` | `shopId/supplierId` 由订单反查，缺失时用 `'0'` 占位 | 接真实订单上下文 |
| `modules/marketing/marketing.service.ts` `handlePriceDiff()` | 只返回 `{action:'需补付'\|'需退回', status:'pending'}` 标记 | 决定是否自动触发补付/退款 |
| `InventoryService.deductStock()` | M3 未调用 | 应在 M5 `markPaid` 支付成功回调中触发实际扣减 |
| `OrderService.markPaid()` | 已为 M5 预留，无 HTTP 入口 | M5 回调接入 |
| `AppModule` | 多注册了一次 `SettlementModule`（`PaymentModule` 已 import 它） | NestJS 复用同一实例，无害；可清理 |
| 顾客端接口 | 未加 `@Public()` | 与现有 shop 模块一致，走登录后 scope；若要做真正的游客浏览需重新设计 scope 来源 |

### P2 — 二期功能（按约定另开对话）
拼团、秒杀、分销、多批发商入驻、规则引擎增强（当前营销叠加互斥配置存于 `promotion_rules.rule_json`，结构见 M7 交付说明）。

---

## 8. 下一步具体动作（给下一个 Agent）

**如果任务是「把代码交付出去」**：
1. 解决 GitHub 认证（向用户索取 PAT，或让用户先在 GitHub 创建仓库并授权）。
2. `git -c http.version=HTTP/1.1` 可绕过本环境的 `HTTP2 framing layer` 报错（代理环境 `127.0.0.1:64267`）。**这是推送时的必要参数**。
3. 推送：`git push -u origin main`（本地已 `git init` + 首次 commit，见第 10 节）。
4. 确认远端 `git ls-remote` 能看到 `refs/heads/main`。

**如果任务是「继续开发」**，优先顺序建议：
1. 补 P1 的订单发货闭环（M4 → M3 状态机）与支付扣库存（M5 → M2）。
2. 补 `delivery_fee_rules` / `notification_templates` 的管理接口或初始化种子。
3. 在有 Docker 的机器做生产 MySQL 全链路验证 + 浏览器端逐一点击 13 个 Web 页面。
4. 接真实微信能力（替换 `modules/integration/*` 下的 Mock Provider）。

**改代码前必读**：第 1 节的 6 条铁律、第 3 节的 Mock Provider token、第 4 节的 sqlite 适配（尤其 `-r dotenv/config` 与 `simple-enum`，改回 `enum` 会让演示模式立刻建表失败）。

---

## 9. 关键文件索引

| 用途 | 路径 |
|---|---|
| 应用装配 | `apps/api/src/app.module.ts`（所有业务模块 + `ScheduleModule.forRoot()` + TypeORM 动态配置） |
| 启动入口 | `apps/api/src/main.ts`（全局前缀、管道、过滤器、Swagger 若配） |
| 配置 | `apps/api/src/config/configuration.ts`、`env.validation.ts` |
| 数据源 | `apps/api/src/database/data-source.ts`（migration/seed 共用） |
| 实体总出口 | `apps/api/src/database/entities/index.ts`（73 个实体） |
| 公共基类 | `apps/api/src/database/entities/base.entity.ts`（动态主键类型） |
| 种子 | `apps/api/src/database/seeds/seed.ts` |
| 迁移 | `apps/api/src/database/migrations/` |
| 权限码/枚举 | `packages/shared/src/enums.ts`、`constants.ts` |
| Web 请求封装 | `apps/admin/src/api/request.ts` |
| 小程序请求基址 | `apps/miniapp/miniprogram/`（改 `BASE_URL` 指向 `http://<你的IP>:3000/api/v1`） |
| 文档导航 | `README.md` → `docs/OPERATIONS.md`（操作步骤）、`docs/FEATURES.md`、`docs/DEPLOYMENT.md`、`docs/USAGE-GUIDE.md`、`docs/GO-LIVE-CHECKLIST.md`、`docs/LOCAL-DEMO.md` |

---

## 10. 常用命令速查

```bash
# 本地免 Docker 演示（推荐）
cd apps/api   && npx ts-node -r dotenv/config src/database/seeds/seed.ts   # 仅首次
cd apps/api   && npx ts-node -r dotenv/config src/main.ts                  # 终端1
cd apps/admin && npx vite --host 0.0.0.0                                   # 终端2

# 生产（需 Docker）
docker compose up -d mysql redis
npm run build:shared && npm run migration:run && npm run seed
npm run dev:api && npm run dev:admin

# 全量类型检查
npx tsc -p packages/shared/tsconfig.json
cd apps/api   && npx tsc --noEmit -p tsconfig.json
cd apps/admin && npx vue-tsc --noEmit
```

> 演示模式下重置数据：停掉 API，把 `apps/api/demo.sqlite` 移走（勿直接提交），重启后会自动建空表，再跑一次 seed。
