# 本地免 Docker 演示启动

本机无 Docker / MySQL / Redis 时，可用 SQLite 演示模式一键跑起全套系统（API + Web 管理端）。

## 启动（两个终端）

终端 1 — API（含自动建表，无需 migration）：
```bash
cd apps/api
npx ts-node -r dotenv/config src/main.ts
```

终端 2 — Web 管理端：
```bash
cd apps/admin
npx vite --host 0.0.0.0
```

- Web 管理端：http://localhost:5173
- API：http://localhost:3000/api/v1（健康检查 `/api/v1/health`）
- 演示数据库：`apps/api/demo.sqlite`（首次启动自动建表）

## 首次初始化种子数据（仅一次）

```bash
cd apps/api
npx ts-node -r dotenv/config src/database/seeds/seed.ts
```

会创建：平台/批发商租户、20 权限点、8 角色、系统配置（含 30% 分账上限）、两个 Web 测试账号。

## Web 管理端登录（内网测试，无需微信）

在登录页输入 openid：
- 平台运营：`admin_platform`
- 批发商管理员：`admin_supplier`

> 这是内网测试登录；生产应替换为微信扫码授权（见 docs/M1-API.md）。

## 为什么用 `-r dotenv/config`

实体装饰器在模块 import 时求值，早于 Nest 加载 `.env`。预加载 dotenv 可确保 `DB_TYPE=sqlite` 在实体加载前就位，从而正确选择主键类型（sqlite=integer）。

## 演示模式与生产模式的差异（重要）

| 项 | 演示模式（DB_TYPE=sqlite） | 生产（DB_TYPE=mysql） |
|---|---|---|
| 数据库 | 本地文件 demo.sqlite | MySQL 8 + migration |
| 建表 | synchronize 自动建表 | 版本化 migration（禁自动同步） |
| enum 列 | simple-enum（varchar+CHECK） | 原生 ENUM |
| 主键 | integer 自增 | bigint |
| 微信/支付/打印/语音 | Mock | 需人工配置 |

演示模式仅用于功能体验，**不得用于生产**。切回生产：把 `apps/api/.env` 的 `DB_TYPE` 改为 `mysql`，按 docs/DEPLOYMENT.md 执行 migration。

## 已导入的演示数据（可选）

本次演示已创建 2 个类目（鲜切花/叶材）和 6 个商品（红玫瑰、郁金香、洋桔梗、向日葵、尤加利叶、香槟玫瑰礼盒），可在 Web 管理端「商品管理」查看，在小程序「商品浏览」看到零售价（无批发价）。
