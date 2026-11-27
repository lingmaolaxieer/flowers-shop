# M1 涉及文件清单（完整路径）

> 工作区根目录：`/Users/ryder.wang/WorkBuddy/2026-11-27-11-19-30`

## 根配置

- `/Users/ryder.wang/WorkBuddy/2026-11-27-11-19-30/package.json`
- `/Users/ryder.wang/WorkBuddy/2026-11-27-11-19-30/docker-compose.yml`
- `/Users/ryder.wang/WorkBuddy/2026-11-27-11-19-30/.env.example`

## 共享契约（packages/shared）

- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/enums.ts`（角色码、权限点、租户类型、审核状态）
- `packages/shared/src/constants.ts`（30% 分账上限、JWT TTL）
- `packages/shared/src/index.ts`

## 后端（apps/api）

### 配置与入口

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/nest-cli.json`
- `apps/api/.env`（本地开发，勿提交生产密钥）
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/app.controller.ts`（health）
- `apps/api/src/config/configuration.ts`
- `apps/api/src/config/env.validation.ts`

### 数据库

- `apps/api/src/database/data-source.ts`
- `apps/api/src/database/entities/base.entity.ts`
- `apps/api/src/database/entities/tenant.entity.ts`
- `apps/api/src/database/entities/supplier.entity.ts`
- `apps/api/src/database/entities/shop.entity.ts`
- `apps/api/src/database/entities/user.entity.ts`
- `apps/api/src/database/entities/user-identity.entity.ts`
- `apps/api/src/database/entities/role.entity.ts`
- `apps/api/src/database/entities/permission.entity.ts`
- `apps/api/src/database/entities/role-permission.entity.ts`
- `apps/api/src/database/entities/user-role-binding.entity.ts`
- `apps/api/src/database/entities/shop-audit.entity.ts`
- `apps/api/src/database/entities/system-config.entity.ts`
- `apps/api/src/database/entities/index.ts`
- `apps/api/src/database/migrations/1700000000000-M1Init.ts`
- `apps/api/src/database/migrations/M1_init.sql`（等价 SQL，人工核对用）
- `apps/api/src/database/seeds/seed.ts`

### 公共层

- `apps/api/src/common/interfaces/jwt-payload.interface.ts`
- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/common/decorators/requires-perm.decorator.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/common/guards/tenant.guard.ts`
- `apps/api/src/common/guards/rbac.guard.ts`
- `apps/api/src/common/interceptors/response.interceptor.ts`
- `apps/api/src/common/filters/all-exceptions.filter.ts`
- `apps/api/src/common/utils/money.ts`

### 业务模块

- `apps/api/src/modules/integration/wechat/wechat.service.ts`（微信适配 + Mock）
- `apps/api/src/modules/auth/auth.module.ts` / `auth.service.ts` / `auth.controller.ts`
- `apps/api/src/modules/auth/dto/wx-login.dto.ts` / `bind-phone.dto.ts` / `switch-identity.dto.ts`
- `apps/api/src/modules/shop/shop.module.ts` / `shop.service.ts` / `shop.controller.ts`
- `apps/api/src/modules/shop/dto/apply-shop.dto.ts` / `audit-shop.dto.ts`
- `apps/api/src/modules/role/role.module.ts` / `role.service.ts` / `role.controller.ts`
- `apps/api/src/modules/role/dto/create-role.dto.ts` / `assign-perms.dto.ts`
- `apps/api/src/modules/user/user.module.ts` / `user.service.ts` / `user.controller.ts`
- `apps/api/src/modules/user/dto/create-staff.dto.ts`
- `apps/api/src/modules/supplier/supplier.module.ts` / `supplier.service.ts` / `supplier.controller.ts`
- `apps/api/src/modules/supplier/dto/create-supplier.dto.ts`

## 小程序（apps/miniapp）

- `apps/miniapp/project.config.json`
- `apps/miniapp/miniprogram/app.json` / `app.ts` / `app.wxss` / `sitemap.json`
- `apps/miniapp/miniprogram/constants/index.ts`
- `apps/miniapp/miniprogram/services/request.ts` / `services/auth.ts`
- `apps/miniapp/miniprogram/pages/auth/index.{ts,wxml,wxss,json}`
- `apps/miniapp/miniprogram/pages/identity/index.{ts,wxml,wxss,json}`
- `apps/miniapp/miniprogram/pages/shop/index.{ts,wxml,wxss,json}`
- `apps/miniapp/miniprogram/pages/mine/index.{ts,wxml,wxss,json}`

## Web 管理端（apps/admin）

- `apps/admin/package.json`
- `apps/admin/index.html`
- `apps/admin/vite.config.ts`
- `apps/admin/tsconfig.json`
- `apps/admin/env.d.ts`
- `apps/admin/src/main.ts` / `src/App.vue`
- `apps/admin/src/api/request.ts` / `src/api/auth.ts`
- `apps/admin/src/router/index.ts` / `src/store/index.ts`
- `apps/admin/src/views/login/index.vue`
- `apps/admin/src/views/shop/index.vue`
- `apps/admin/src/views/role/index.vue`
- `apps/admin/src/views/supplier/index.vue`

## 文档

- `docs/M1-FILES.md`（本文件）
- `docs/M1-API.md`
- `docs/M1-SELFTEST.md`
- `docs/M1-ACCEPTANCE.md`
