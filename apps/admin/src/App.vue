<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const isPublic = computed(() => Boolean(route.meta.public));

function onLogout(): void {
  localStorage.clear();
  void router.push('/login');
}
</script>

<template>
  <el-container v-if="!isPublic" style="height: 100vh">
    <el-aside width="210px" style="background: #001529">
      <div class="logo">鲜花批零管理端</div>
      <el-menu
        router
        :default-active="route.path"
        background-color="#001529"
        text-color="#bfcbd9"
        active-text-color="#ffd04b"
      >
        <el-menu-item index="/shop-audits">店家审核</el-menu-item>
        <el-menu-item index="/roles">角色权限</el-menu-item>
        <el-menu-item index="/suppliers">批发商管理</el-menu-item>
        <el-menu-item index="/products">商品管理</el-menu-item>
        <el-menu-item index="/prices">价格管理</el-menu-item>
        <el-menu-item index="/inventory">库存管理</el-menu-item>
        <el-menu-item index="/orders">订单管理</el-menu-item>
        <el-menu-item index="/commission">抽成规则</el-menu-item>
        <el-menu-item index="/delivery">配送管理</el-menu-item>
        <el-menu-item index="/promotions">营销管理</el-menu-item>
        <el-menu-item index="/reports">报表导出</el-menu-item>
        <el-menu-item index="/statements">周期对账</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span>{{ route.meta.title || '管理后台' }}</span>
        <el-button size="small" @click="onLogout">退出登录</el-button>
      </el-header>
      <el-main style="background: #f0f2f5">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
  <router-view v-else />
</template>

<style scoped>
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
