import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('../views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  { path: '/', redirect: '/shop-audits' },
  {
    path: '/shop-audits',
    component: () => import('../views/shop/index.vue'),
    meta: { title: '店家审核' },
  },
  {
    path: '/roles',
    component: () => import('../views/role/index.vue'),
    meta: { title: '角色权限' },
  },
  {
    path: '/suppliers',
    component: () => import('../views/supplier/index.vue'),
    meta: { title: '批发商管理' },
  },
  {
    path: '/products',
    component: () => import('../views/product/index.vue'),
    meta: { title: '商品管理' },
  },
  {
    path: '/prices',
    component: () => import('../views/price/index.vue'),
    meta: { title: '价格管理' },
  },
  {
    path: '/inventory',
    component: () => import('../views/inventory/index.vue'),
    meta: { title: '库存管理' },
  },
  {
    path: '/orders',
    component: () => import('../views/order/index.vue'),
    meta: { title: '订单管理' },
  },
  {
    path: '/commission',
    component: () => import('../views/commission/index.vue'),
    meta: { title: '抽成规则' },
  },
  {
    path: '/delivery',
    component: () => import('../views/delivery/index.vue'),
    meta: { title: '配送管理' },
  },
  {
    path: '/promotions',
    component: () => import('../views/promotion/index.vue'),
    meta: { title: '营销管理' },
  },
  {
    path: '/reports',
    component: () => import('../views/report/index.vue'),
    meta: { title: '报表导出' },
  },
  {
    path: '/statements',
    component: () => import('../views/statement/index.vue'),
    meta: { title: '周期对账' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (!to.meta.public && !localStorage.getItem('token')) return '/login';
  return true;
});

export default router;
