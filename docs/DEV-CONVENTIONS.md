# 鲜花批发零售小程序 — 开发约定（强制）

> 所有模块（含并行开发）必须严格遵守本约定。违反者视为不合格交付。

## 1. 技术栈（已锁定，不得更换）
- 后端：NestJS 10 + TypeScript + TypeORM 0.3 + MySQL 8.0 + Redis 7
- 小程序：微信原生 + TypeScript
- Web：Vue3 + Vite + Element Plus + Pinia
- 共享契约：`@flower/shared`（packages/shared）

## 2. 多租户铁律
- 所有业务表含 `tenant_id`（bigint），批发商相关含 `supplier_id`，花店相关含 `shop_id`。
- 实体字段用驼峰 `tenantId/supplierId/shopId`，列名用下划线。
- **禁止客户端传租户字段**：TenantGuard 已从 body/query 剥离。
- 所有查询/更新必须带 scope 过滤，禁止全表扫描。

## 3. 金额与价格隔离
- 金额一律 **BIGINT 存整数分**；工具见 `common/utils/money.ts`。
- **顾客端任何接口/页面禁止返回批发价、成本、抽成字段**。顾客端用独立 DTO 白名单 map 后返回。
- 批发价只存在于价格域与店家/批发商订单明细。

## 4. 分账铁律
- 微信分账最高 30%（`PROFIT_SHARE_MAX_RATIO=0.3`），只按金额分账，有冻结期。
- 抽成 >30% 强制转人工结算模式。

## 5. 不可实现项抽象
- `PaymentService / ProfitShareService / PrinterService / NotificationService / VoiceService / StorageService` 均为可替换 Provider，提供 Mock 实现，标注"需人工配置/真机调试"。

## 6. 代码模式（照抄现有文件风格）
- 实体继承 `BaseEntity`；`@Entity`/`@Index` 齐全。
- 控制器用 `@CurrentUser() user: JwtPayload` 与 `@CurrentScope() scope: RequestScope` 取身份。
- 权限用 `@RequiresPerm(PermCode.XXX)`；公开接口用 `@Public()`。
- 写操作参数校验用 class-validator DTO；返回直接 return（ResponseInterceptor 统一包装）。
- 事务用 `DataSource.transaction` 或 `QueryRunner`；涉及库存/支付必须用事务。
- Module 用 `TypeOrmModule.forFeature([...])` 注册实体。

## 7. 迁移脚本
- 每里程碑一个 migration：`apps/api/src/database/migrations/17<时间戳>-M<N><Name>.ts`。
- 同时提供等价裸 SQL：`M<N>_<name>.sql`。
- 禁止 `synchronize: true`，一律走 migration。

## 8. 验证方式（重要）
- 用 `cd apps/api && npx tsc --noEmit -p tsconfig.json` 做类型检查。
- **不要运行 `nest build`**（会触发批量删除保护）；不要重新 `npm install`。

## 9. 实体注册与模块集成
- 新实体写完后由主集成方统一加入 `database/entities/index.ts`。
- 新 Module 由主集成方统一加入 `app.module.ts`。
- 各模块开发方不要修改这两个文件，也不要改 shared 包。

## 10. 交付报告格式
完成后只返回：创建的文件清单 + 接口清单（方法 路径 说明）+ 编译结果（有错误逐条列出）。不要粘贴大段代码。
