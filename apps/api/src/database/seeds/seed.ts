import 'reflect-metadata';
import {
  AuditStatus,
  IdentityScope,
  PermCode,
  PROFIT_SHARE_MAX_RATIO,
  RoleCode,
  TenantType,
} from '@flower/shared';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../data-source';
import {
  Permission,
  Role,
  RolePermission,
  Supplier,
  SystemConfig,
  Tenant,
  User,
  UserIdentity,
} from '../entities';

/** 预置角色 → 权限映射。顾客角色仅持有只读/下单权限，绝不含批发价或写权限。 */
const ROLE_PERMISSIONS: Record<string, PermCode[]> = {
  [RoleCode.PLATFORM_ADMIN]: Object.values(PermCode) as PermCode[],
  [RoleCode.SUPPLIER_ADMIN]: [
    PermCode.PRODUCT_READ, PermCode.PRODUCT_WRITE,
    PermCode.PRICE_READ, PermCode.PRICE_WRITE,
    PermCode.INVENTORY_READ, PermCode.INVENTORY_WRITE,
    PermCode.ORDER_READ, PermCode.ORDER_WRITE,
    PermCode.FINANCE_READ, PermCode.FINANCE_WRITE,
    PermCode.SERVICE_READ, PermCode.SERVICE_WRITE,
    PermCode.QR_PRINT, PermCode.EXPORT_READ,
    PermCode.AUDIT_READ, PermCode.AUDIT_WRITE,
    PermCode.ROLE_READ, PermCode.ROLE_WRITE,
    PermCode.SUPPLIER_READ, PermCode.SUPPLIER_WRITE,
  ],
  [RoleCode.SUPPLIER_PICKER]: [
    PermCode.PRODUCT_READ,
    PermCode.INVENTORY_READ, PermCode.INVENTORY_WRITE,
    PermCode.ORDER_READ, PermCode.ORDER_WRITE,
    PermCode.QR_PRINT,
    PermCode.SERVICE_READ,
  ],
  [RoleCode.SUPPLIER_SERVICE]: [
    PermCode.PRODUCT_READ,
    PermCode.ORDER_READ, PermCode.ORDER_WRITE,
    PermCode.SERVICE_READ, PermCode.SERVICE_WRITE,
    PermCode.FINANCE_READ,
  ],
  [RoleCode.SHOP_MANAGER]: [
    PermCode.PRODUCT_READ,
    PermCode.PRICE_READ,
    PermCode.INVENTORY_READ, PermCode.INVENTORY_WRITE,
    PermCode.ORDER_READ, PermCode.ORDER_WRITE,
    PermCode.FINANCE_READ,
    PermCode.EXPORT_READ,
    PermCode.SERVICE_READ, PermCode.SERVICE_WRITE,
  ],
  [RoleCode.SHOP_STAFF]: [
    PermCode.PRODUCT_READ,
    PermCode.PRICE_READ,
    PermCode.INVENTORY_READ,
    PermCode.ORDER_READ, PermCode.ORDER_WRITE,
    PermCode.SERVICE_READ,
  ],
  [RoleCode.CUSTOMER]: [
    PermCode.PRODUCT_READ, // 仅零售价，价格脱敏由 PriceMaskInterceptor 保证
    PermCode.ORDER_READ,
    PermCode.ORDER_WRITE,
  ],
  [RoleCode.DELIVERY_PERSON]: [
    PermCode.ORDER_READ,
    PermCode.ORDER_WRITE,
  ],
};

const ROLE_DEFS: Array<{ code: RoleCode; name: string; scope: IdentityScope }> = [
  { code: RoleCode.PLATFORM_ADMIN, name: '平台运营', scope: IdentityScope.PLATFORM },
  { code: RoleCode.SUPPLIER_ADMIN, name: '批发商管理员', scope: IdentityScope.SUPPLIER },
  { code: RoleCode.SUPPLIER_PICKER, name: '批发商配货员', scope: IdentityScope.SUPPLIER },
  { code: RoleCode.SUPPLIER_SERVICE, name: '批发商客服', scope: IdentityScope.SUPPLIER },
  { code: RoleCode.SHOP_MANAGER, name: '店家店长', scope: IdentityScope.SHOP },
  { code: RoleCode.SHOP_STAFF, name: '店家店员', scope: IdentityScope.SHOP },
  { code: RoleCode.CUSTOMER, name: '普通顾客', scope: IdentityScope.PERSONAL },
  { code: RoleCode.DELIVERY_PERSON, name: '配送员', scope: IdentityScope.PERSONAL },
];

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.log('[seed] 数据库连接成功');

  const tenantRepo = AppDataSource.getRepository(Tenant);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const permRepo = AppDataSource.getRepository(Permission);
  const roleRepo = AppDataSource.getRepository(Role);
  const rpRepo = AppDataSource.getRepository(RolePermission);
  const configRepo = AppDataSource.getRepository(SystemConfig);
  const userRepo = AppDataSource.getRepository(User);
  const identityRepo = AppDataSource.getRepository(UserIdentity);

  // 1. 平台租户
  let platform = await tenantRepo.findOne({ where: { name: '平台运营' } });
  if (!platform) {
    platform = await tenantRepo.save(
      tenantRepo.create({ name: '平台运营', type: TenantType.PLATFORM, status: 1 }),
    );
    console.log(`[seed] 创建平台租户 id=${platform.id}`);
  }

  // 2. 自测用批发商租户与批发商（正式多批发商入驻由 Web 端创建）
  let supplierTenant = await tenantRepo.findOne({ where: { name: '默认批发商租户' } });
  if (!supplierTenant) {
    supplierTenant = await tenantRepo.save(
      tenantRepo.create({ name: '默认批发商租户', type: TenantType.SUPPLIER, status: 1 }),
    );
  }
  let supplier = await supplierRepo.findOne({ where: { name: '欣欣鲜花批发' } });
  if (!supplier) {
    supplier = await supplierRepo.save(
      supplierRepo.create({
        tenantId: supplierTenant.id,
        name: '欣欣鲜花批发',
        contactName: '张经理',
        contactPhone: '13800000000',
        status: 1,
      }),
    );
    console.log(`[seed] 创建自测批发商 id=${supplier.id}, tenantId=${supplierTenant.id}`);
  }

  // 3. 权限点
  const permMap = new Map<string, Permission>();
  for (const code of Object.values(PermCode)) {
    let perm = await permRepo.findOne({ where: { permCode: code } });
    if (!perm) {
      const [module, action] = code.split(':');
      perm = await permRepo.save(
        permRepo.create({ permCode: code, module, action, description: `${module} ${action}` }),
      );
    }
    permMap.set(code, perm);
  }
  console.log(`[seed] 权限点 ${permMap.size} 个就位`);

  // 4. 角色 + 5. 角色权限
  for (const def of ROLE_DEFS) {
    let role = await roleRepo.findOne({ where: { roleCode: def.code, tenantId: IsNull() } });
    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          tenantId: undefined,
          roleCode: def.code,
          name: def.name,
          scope: def.scope,
          status: 1,
        }),
      );
    }
    for (const permCode of ROLE_PERMISSIONS[def.code] ?? []) {
      const perm = permMap.get(permCode);
      if (!perm) continue;
      const exists = await rpRepo.findOne({
        where: { roleId: role.id, permId: perm.id },
      });
      if (!exists) {
        await rpRepo.save(rpRepo.create({ roleId: role.id, permId: perm.id }));
      }
    }
  }
  console.log('[seed] 预置角色与角色权限就位');

  // 6. 系统配置（含 30% 分账上限铁律）
  const configs: Array<{ key: string; value: string; description: string }> = [
    { key: 'profit_share_max_ratio', value: String(PROFIT_SHARE_MAX_RATIO), description: '微信分账最高比例，默认 30%，只能按金额分账' },
    { key: 'customer_order_timeout_minutes', value: '30', description: '顾客订单待店家确认超时自动取消时长（分钟）' },
    { key: 'order_confirm_timeout_minutes', value: '30', description: '订单确认超时自动取消时长（分钟，OrderService/定时任务读取）' },
    { key: 'settlement_default_cycle', value: 'month', description: '周期对账单默认周期：day/week/month' },
    { key: 'wechat_pay_enabled', value: 'false', description: '微信支付是否启用（需商户号与证书后开启）' },
  ];
  for (const item of configs) {
    const exists = await configRepo.findOne({ where: { key: item.key } });
    if (!exists) {
      await configRepo.save(configRepo.create(item));
    }
  }
  console.log('[seed] 系统配置就位（含 profit_share_max_ratio=0.3）');

  // 7. Web 管理端内网测试账号（正式登录应改为扫码授权，见 docs/M1-API.md）
  const testAccounts = [
    {
      openid: 'admin_platform',
      phone: '13900000001',
      roleCode: RoleCode.PLATFORM_ADMIN,
      tenantId: platform.id,
      supplierId: undefined,
    },
    {
      openid: 'admin_supplier',
      phone: '13900000002',
      roleCode: RoleCode.SUPPLIER_ADMIN,
      tenantId: supplierTenant.id,
      supplierId: supplier.id,
    },
  ];
  for (const acc of testAccounts) {
    let user = await userRepo.findOne({ where: { openid: acc.openid } });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({ openid: acc.openid, phone: acc.phone, status: 1 }),
      );
      const existIdentity = await identityRepo.findOne({
        where: { userId: user.id, roleCode: acc.roleCode },
      });
      if (!existIdentity) {
        await identityRepo.save(
          identityRepo.create({
            userId: user.id,
            tenantId: acc.tenantId,
            supplierId: acc.supplierId,
            roleCode: acc.roleCode,
            auditStatus: AuditStatus.APPROVED,
            status: 1,
          }),
        );
      }
      console.log(`[seed] 创建管理端测试账号 openid=${acc.openid}, role=${acc.roleCode}`);
    }
  }

  await AppDataSource.destroy();
  console.log('[seed] 完成');
}

main().catch(async (err) => {
  console.error('[seed] 失败:', err);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
