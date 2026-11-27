# 操作步骤手册（总入口）

> 面向要**把系统跑起来并动手操作**的人。按「选一种启动方式 → 初始化 → 登录 → 按角色操作 → 停/重启/排障」组织。
> 更细的业务规则与字段说明见 `USAGE-GUIDE.md`；部署到服务器见 `DEPLOYMENT.md`；上线前逐项打勾见 `GO-LIVE-CHECKLIST.md`。

---

## 0. 前置条件

| 项 | 要求 |
|---|---|
| Node.js | ≥ 20（根 `package.json` engines 声明） |
| npm | ≥ 9（workspaces 支持） |
| 生产模式 | Docker + Docker Compose |
| 演示模式 | 无额外依赖（用 SQLite，自动下载编译好的 `better-sqlite3`） |
| 小程序 | 微信开发者工具 + 自己的 AppID（仅小程序端需要） |

---

## 1. 选择启动方式

| 方式 | 适合 | 数据库 | 是否需要 Docker |
|---|---|---|---|
| **A. 本地演示（推荐先跑这个）** | 体验功能、点页面、验证接口 | SQLite 文件 `apps/api/demo.sqlite`，自动建表 | ❌ |
| **B. 生产/联调模式** | 验证 migration、真实 SQL、上线前联调 | MySQL 8 + Redis | ✅ |

> ⚠️ 两种方式**不要混用**同一个 `.env`。切换时只改 `apps/api/.env` 的 `DB_TYPE`：
> `sqlite` = 演示，`mysql` = 生产。生产务必执行 migration，演示模式靠 `synchronize` 自动建表。

---

## 2. 方式 A：本地免 Docker 演示（约 2 分钟）

### 第 1 步：安装依赖（仓库根目录，只做一次）

```bash
cd /path/to/flowers-shop
npm install
```

### 第 2 步：准备环境变量

```bash
cp .env.example apps/api/.env
```

在 `apps/api/.env` 中确认/加入这两行（演示模式关键）：

```ini
DB_TYPE=sqlite
SQLITE_PATH=demo.sqlite
```

其余保持默认：`PORT=3000`、`API_PREFIX=api/v1`、`WX_MOCK_LOGIN=true`、`JWT_SECRET` 为开发占位值。

> **生产安全提示**：`JWT_SECRET`、`QR_SIGN_SECRET`、`MYSQL_PASSWORD` 上线前必须换成强随机值，且 `.env` 已被 `.gitignore` 排除，不要提交。

### 第 3 步：初始化种子数据（仅首次，或重置数据库后）

```bash
cd apps/api
npx ts-node -r dotenv/config src/database/seeds/seed.ts
```

预期输出包含：租户、20 权限点、8 角色、系统配置（含 30% 分账上限）、2 个测试账号。

> **为什么必须带 `-r dotenv/config`**：实体装饰器在模块 import 时求值，早于 Nest 加载 `.env`；预加载 dotenv 才能让 `DB_TYPE=sqlite` 在实体加载前就位，否则主键类型会回退成 bigint 导致建表失败。

### 第 4 步：启动 API（终端 1）

```bash
cd apps/api
npx ts-node -r dotenv/config src/main.ts
```

看到 `Nest application successfully started` 且路由映射完成即成功。
验证：`curl http://localhost:3000/api/v1/health` → 200。

### 第 5 步：启动 Web 管理端（终端 2）

```bash
cd apps/admin
npx vite --host 0.0.0.0
```

浏览器打开 **http://localhost:5173**（Vite 已把 `/api` 代理到 `localhost:3000`）。

### 第 6 步：登录

在登录页输入 openid（内网 Mock 登录，无需微信）：

| 账号 | 角色 | 用途 |
|---|---|---|
| `admin_platform` | 平台运营 | 租户、角色、权限、全局配置 |
| `admin_supplier` | 批发商管理员 | 商品、价格、库存、订单、结算、营销、报表 |

登录后拿到 JWT，后续接口自动带 `Authorization: Bearer <token>`。

### 第 7 步（可选）：灌入演示商品

没有商品时列表是空的。可用批发商账号调批量导入接口，或直接在 Web 管理端「商品管理」新建。示例：

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/v1/auth/web-login \
  -H 'Content-Type: application/json' -d '{"openid":"admin_supplier"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# 建类目
curl -s -X POST http://localhost:5173/api/v1/admin/product-categories \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"鲜切花","sort":1}'

# 批量导入商品（金额单位：分）
curl -s -X POST http://localhost:5173/api/v1/admin/products/import \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"categoryId":"<上一步返回的id>","name":"红玫瑰","variety":"卡罗拉","grade":"A级","origin":"云南昆明","spec":"50cm","unit":"扎","skus":[{"unit":"扎","retailPrice":3500},{"unit":"枝","retailPrice":180}]}]}'
```

---

## 3. 方式 B：生产 / 联调模式（Docker）

### 第 1 步：环境变量

```bash
cp .env.example .env                 # 根目录，给 docker-compose 用
cp .env.example apps/api/.env        # 后端用
```

编辑 `apps/api/.env`，**删除或注释** `DB_TYPE=sqlite` / `SQLITE_PATH` 两行（或改为 `DB_TYPE=mysql`），并填好 `MYSQL_*`、`REDIS_*`、强随机 `JWT_SECRET` / `QR_SIGN_SECRET`。

### 第 2 步：起基础设施 + 依赖

```bash
npm install
docker compose up -d mysql redis
npm run build:shared
```

### 第 3 步：执行迁移与种子

```bash
npm run migration:run       # 8 个版本化迁移，建 70+ 张表
npm run seed                # 权限/角色/配置/测试账号
```

> 迁移同时提供等价裸 SQL（`apps/api/src/database/migrations/M*.sql`），DBA 可审阅后手工执行。
> 回滚：`npm run migration:revert`（一次回退一个版本）。

### 第 4 步：启动服务

```bash
npm run dev:api             # http://localhost:3000/api/v1
npm run dev:admin           # http://localhost:5173
```

生产构建：`npm run build:api && npm run build:admin`，配合 `nginx/nginx.conf` 反向代理，详见 `DEPLOYMENT.md`。

---

## 4. 小程序端

微信原生小程序**不能在浏览器直接运行**：

1. 打开微信开发者工具 → 导入项目 → 选择 `apps/miniapp`。
2. 填入自己的 AppID（或使用测试号）。
3. 把请求基址 `BASE_URL` 指向本机 API：`http://<你的局域网IP>:3000/api/v1`（真机预览时不能用 `localhost`）。
4. 在开发者工具中勾选「不校验合法域名」用于本地调试。
5. 编译预览。顾客端页面：商品浏览、商品详情、购物车、订单列表/详情；配货/配送/对账入口在「我的」按角色显示。

> 扫码出货与蓝牙 TSPL 标签打印需真机 + 支持 TSPL 的便携打印机，见 `apps/miniapp/miniprogram/utils/bluetooth.ts`。

---

## 5. 常见业务操作速查

| 我想做… | 入口 | 关键接口 |
|---|---|---|
| 上架商品、传图片 | Web「商品管理」 | `POST /admin/products`、`POST /admin/products/:id/media`、`POST /admin/products/import` |
| 设每日价 / 一店一价 / 等级价 / 阶梯价 | Web「价格管理」 | `POST /admin/prices/daily` 等；取价优先级：一店一价 > 等级价 > 阶梯价 > 每日价（`POST /prices/quote`） |
| 查库存、登记损耗、处理预警 | Web「库存管理」 | `GET /admin/inventory`、`POST /admin/inventory/adjust`（有符号 qty）、`POST /admin/inventory/loss`、`POST /admin/inventory/alerts/:id/confirm` |
| 处理订单流转 | Web「订单管理」 | `POST /admin/orders/:id/accept\|pick\|ship\|deliver\|complete` |
| 生成二维码、看出货记录 | Web / 小程序扫码 | `POST /admin/qr-codes/generate`、`GET /admin/scan-records` |
| 试算运费 | 小程序购物车 | `POST /delivery/quote`（**需先初始化 `delivery_fee_rules`**，否则 404） |
| 配佣金、切分账模式 | Web「佣金/结算」 | `PUT /admin/settlement-configs/:shopId`（切 profit_share 触发 30% 校验）、`POST /admin/profit-share` |
| 生成 / 确认 / 审核 / 导出对账单 | Web「对账单」 | `POST /admin/settlement-statements/generate` → `confirm` → `review` → `GET :id/export` |
| 导出 8 类报表 | Web「报表」 | `GET /admin/reports/:type`、`POST /admin/reports/:type/export` |
| 发优惠券、配营销活动 | Web「营销」 | `POST /admin/coupons`、`/admin/promotions/*`、`POST /admin/marketing/simulate`（优惠试算） |
| 发订阅消息 / 语音播报 | 接口 | `POST /admin/notifications/send`（**需先初始化 `notification_templates`**，否则 400） |

**金额填写口径**：所有接口金额都是「分」。例：35 元 → `3500`；Excel 导出时自动 ÷100 显示为元。

---

## 6. 停止 / 重启 / 重置

```bash
# 停止：在两个终端分别 Ctrl+C

# 查看端口占用
lsof -nP -iTCP:3000 -iTCP:5173 -sTCP:LISTEN

# 重置演示数据库（清空所有数据，重新建表 + seed）
cd apps/api
mv demo.sqlite "demo.sqlite.bak.$(date +%s)"      # 用 mv 而非直接删，保留可恢复副本
npx ts-node -r dotenv/config src/main.ts           # 自动建空表
npx ts-node -r dotenv/config src/database/seeds/seed.ts
```

> `*.sqlite*` 与 `*.bak` 已被 `.gitignore` 排除，不会进仓库。

---

## 7. 故障排查

| 现象 | 原因 / 处理 |
|---|---|
| `Cannot find module '@nestjs/platform-express'` | 依赖缺失 → `npm install @nestjs/platform-express@10` |
| `DataTypeNotSupportedError: "enum"` / sqlite 建表失败 | 实体被改回 `type:'enum'` → 演示模式必须用 `simple-enum`；且启动要带 `-r dotenv/config` |
| `Column type for Shop#auditRemark is not defined` | `?: string \| null` 联合类型反射为 Object → 该列 `@Column` 必须显式写 `type:'varchar'` |
| `SqliteError: AUTOINCREMENT is only allowed on INTEGER PRIMARY KEY` | `DB_TYPE` 没在实体加载前生效 → 用 `npx ts-node -r dotenv/config src/main.ts` 启动 |
| `DriverPackageNotInstalledError: sqlite3` | 应使用 `better-sqlite3` 驱动（`configuration.ts` 中 `type:'better-sqlite3'`）；`sqlite3@5` 在 Python 3.12 编译失败，别再装 |
| `HTTP2 framing layer` / GitHub 推送失败 | 代理环境 → 用 `git -c http.version=HTTP/1.1 ...` |
| `could not read Username for 'https://github.com'` | 目标仓库私有或需要认证 → 配置 PAT / credential helper |
| `nest start` 启动异常 | 本环境 `nest start` 会清理 `dist` 触发删除保护 → 改用 `ts-node` 直接跑 `main.ts` |
| `/delivery/quote` 返回 404 | 无启用的 `delivery_fee_rules` 记录 → 手工插入或补管理接口 |
| `/admin/notifications/send` 返回 400 | 无 `notification_templates` 记录 → 先配置订阅消息模板 ID |
| 页面空白 / 接口 401 | 检查 Vite 代理是否指向 3000、JWT 是否过期（默认 7d），重新登录 |
| 顾客端看到了批发价 | **严重违规**，立刻检查 `product-public.vo.ts` / `order.vo.ts` 白名单，别直接返回实体 |

---

## 8. 文档导航

| 文档 | 内容 |
|---|---|
| `README.md` | 项目概览、快速开始、目录结构 |
| **`OPERATIONS.md`（本文）** | 启动 / 登录 / 操作 / 排障 |
| `LOCAL-DEMO.md` | 演示模式精简版说明与生产模式差异对照 |
| `USAGE-GUIDE.md` | 按角色（批发商/店家/配货员/配送员/顾客/平台）的完整操作规范 |
| `FEATURES.md` | M0–M9 功能矩阵、接口清单 |
| `DEPLOYMENT.md` | 生产部署、环境变量、Nginx、备份 |
| `DEVELOPER-GUIDE.md` / `DEV-CONVENTIONS.md` | 二次开发规范、目录约定、如何新增模块 |
| `GO-LIVE-CHECKLIST.md` | 上线前逐项检查清单 |
| `HANDOFF.md` | **给下一个 Agent 的执行摘要与待办** |
| `M1-*.md` | M1 基座的文件清单、API、验收、自测记录 |
