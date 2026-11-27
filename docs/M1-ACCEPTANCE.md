# M1 验收清单

> 每项均可通过 `docs/M1-SELFTEST.md` 复现。请逐项确认后，再进入 M2。

## A. 代码与可运行性

- [ ] `npm install` 成功，Monorepo workspaces 全部安装
- [ ] `npm run build:shared` 成功
- [ ] `npm run build:api` 成功（TypeScript 零错误）
- [ ] `npm run build:admin` 成功（Vue3 零错误）
- [ ] `npm run migration:run` 成功，生成 11 张表
- [ ] `npm run seed` 成功且可重复执行（幂等）
- [ ] `npm run dev:api` 启动，`/api/v1/health` 返回 ok

## B. 数据模型（多租户铁律）

- [ ] `tenants / suppliers / shops / user_identities / user_role_bindings / shop_audits` 均含 `tenant_id`
- [ ] `shops / shop_audits / user_identities / user_role_bindings` 均含 `supplier_id`
- [ ] 顾客身份归属平台租户，批发商身份归属批发商租户 + supplier
- [ ] `system_configs.profit_share_max_ratio = 0.3` 已写入
- [ ] 金额字段设计统一整数分（M1 暂无金额表，M2 起生效）

## C. 账号、角色与权限

- [ ] 8 个预置角色、20 个权限点种子数据齐全
- [ ] `admin_platform`（平台运营）可访问全部 admin 接口
- [ ] `admin_supplier`（批发商管理员）可访问商品/订单/审核等，但不可创建批发商（缺 `supplier:write`）—— 注：预置中批发商管理员含 `supplier:write`，若需收紧可在 seed 中调整
- [ ] 顾客 token 访问 `/admin/shop-audits` 返回 403
- [ ] 客户端传 `tenantId` 被 400 拒绝或服务端剥离
- [ ] 无 token 访问受保护接口返回 401
- [ ] 预置角色权限不可修改（403），自定义角色可创建并分配权限

## D. 多身份切换

- [ ] 首次登录自动创建 `CUSTOMER` 身份
- [ ] `/auth/identities` 返回身份列表，最近使用身份优先
- [ ] `/auth/switch-identity` 校验归属、启用状态、审核状态
- [ ] 切换后新 token 的 `roleCode / tenantId / supplierId / shopId / perms` 全部更新
- [ ] 停用子账号后其身份切换失败

## E. 店家审核闭环

- [ ] 顾客可提交店家申请（花店名/营业执照号/手机号）
- [ ] 重复申请被拒绝
- [ ] 不传 `supplierId` 时自动绑定默认批发商
- [ ] 平台/批发商可查看待审列表并筛选状态
- [ ] 通过后：审核单 + 花店状态变 `approved`，店主自动获得 `SHOP_MANAGER` 身份
- [ ] 驳回必须填写原因；驳回后不发放店长身份
- [ ] 批发商账号仅可见本 supplier 的审核记录

## F. 三端联调

- [ ] 小程序：登录 → 我的 → 店家申请 → 审核通过后身份列表出现「店长」→ 切换成功
- [ ] Web：平台账号审核通过小程序提交的申请
- [ ] Web：批发商账号查看批发商列表，仅见自身数据
- [ ] Web：角色权限页可查看预置角色与权限字典

## G. 需人工配置 / 真机调试（不阻塞代码验收）

- [ ] 微信小程序 AppID / AppSecret 已提供（当前 Mock 登录）
- [ ] 小程序后台开通「手机号快速验证」组件（当前 Mock 手机号）
- [ ] 备案域名 + HTTPS 已配置，小程序 request 合法域名已添加
- [ ] 营业执照真伪由人工核验（系统只存证）
- [ ] Web 管理端正式扫码登录待二期（当前 openid 内网登录）

---

**确认结论**：□ 通过，进入 M2　□ 需修改（请列明条目）
