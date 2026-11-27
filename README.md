# 鲜花批发零售微信小程序

一套完整可运行的鲜花批发 + 零售系统：微信小程序（顾客/店家/配货员/配送员）+ Web 管理端（批发商/平台运营）+ NestJS 后端（MySQL + Redis）。

## 快速开始

### 方式 A：本地免 Docker 演示（推荐先体验）

无需 MySQL/Redis，用 SQLite 自动建表，2 分钟跑起来。完整步骤见 [操作步骤手册](docs/OPERATIONS.md)。

```bash
npm install
cp .env.example apps/api/.env      # 在 apps/api/.env 中确认 DB_TYPE=sqlite
cd apps/api && npx ts-node -r dotenv/config src/database/seeds/seed.ts   # 仅首次
cd apps/api && npx ts-node -r dotenv/config src/main.ts                  # 终端 1 → :3000
cd apps/admin && npx vite --host 0.0.0.0                                 # 终端 2 → :5173
```

> `-r dotenv/config` 不能省略：实体装饰器在 import 时求值，早于 Nest 加载 `.env`。详见 [LOCAL-DEMO.md](docs/LOCAL-DEMO.md)。

### 方式 B：生产模式（Docker + MySQL）

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（生产务必修改密钥）
cp .env.example .env                 # 根目录，给 docker-compose 用
cp .env.example apps/api/.env        # 后端用；删除其中 DB_TYPE=sqlite 两行

# 3. 启动数据库
docker compose up -d mysql redis

# 4. 构建 + 迁移 + 种子
npm run build:shared
npm run migration:run
npm run seed

# 5. 启动后端
npm run dev:api          # http://localhost:3000/api/v1

# 6. 启动管理端
npm run dev:admin        # http://localhost:5173
```

Web 管理端内网测试账号（openid 登录，见 docs/M1-API.md）：`admin_platform`（平台运营）、`admin_supplier`（批发商管理员）。

## 文档导航（按需阅读）

**如果你是使用者，先看这两份：**
- [操作步骤手册](docs/OPERATIONS.md) — 启动、登录、按角色操作、停止/重置、故障排查（总入口）
- [使用规范与操作手册](docs/USAGE-GUIDE.md) — 各角色怎么操作系统
- [功能清单](docs/FEATURES.md) — 系统都实现了什么
- [本地免 Docker 演示](docs/LOCAL-DEMO.md) — SQLite 演示模式与生产模式差异对照

**如果你是接手开发的 Agent：**
- [HANDOFF 交接摘要](docs/HANDOFF.md) — 已完成什么、非常规改动及原因、已知限制、下一步具体动作

**如果你要部署上线：**
- [部署文档](docs/DEPLOYMENT.md) — 服务器初始化、域名/HTTPS、小程序后台配置、隐私声明
- [上线验收清单](docs/GO-LIVE-CHECKLIST.md) — 逐项打勾

**如果你要二次开发：**
- [二次开发说明](docs/DEVELOPER-GUIDE.md) — 代码结构、配置项、常见修改场景
- [开发约定](docs/DEV-CONVENTIONS.md) — 强制编码规范（多租户/价格隔离/抽象层）

**里程碑文档（M1）：**
- `docs/M1-API.md`、`docs/M1-FILES.md`、`docs/M1-SELFTEST.md`、`docs/M1-ACCEPTANCE.md`

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | NestJS 10 + TypeScript + TypeORM 0.3 + MySQL 8 + Redis 7 |
| 小程序 | 微信原生 + TypeScript |
| Web | Vue3 + Vite + Element Plus + Pinia |
| 共享契约 | packages/shared（枚举/常量） |
| 部署 | Docker Compose（mysql/redis/api/nginx） |

## 核心铁律

1. 多租户从第一天起：所有业务表带 tenant_id，批发商相关带 supplier_id，花店相关带 shop_id。
2. 顾客端价格隔离：顾客接口白名单 VO，绝不返回批发价/成本。
3. 微信分账 ≤ 30%、只按金额；超标强制转人工结算。
4. 不可实现项（支付/分账/蓝牙打印/语音/存储）全部抽象为可替换 Provider + Mock 实现。
5. 金额统一整数分存储；**生产禁止 synchronize，一律走 migration**（仅 `DB_TYPE=sqlite` 的本地演示模式例外，用自动建表跳过 MySQL 专有迁移）。

## 需要人工提供

微信小程序 AppID/AppSecret、微信支付商户号+分账权限+证书、已备案域名+HTTPS 证书、对象存储/CDN 密钥、TSPL 便携蓝牙打印机、订阅消息模板 ID、营业执照样本。

## 二期（另开对话）

拼团、秒杀、分销、多批发商入驻入口、规则引擎增强。
