<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { webLogin } from '../../api/auth';

const router = useRouter();
const openid = ref('admin_platform');
const loading = ref(false);

async function onLogin(): Promise<void> {
  if (!openid.value) {
    ElMessage.warning('请输入 openid');
    return;
  }
  loading.value = true;
  try {
    const res = await webLogin(openid.value);
    ElMessage.success(`登录成功：${res.currentIdentity.roleCode}`);
    await router.push('/');
  } catch (err: any) {
    ElMessage.error(err?.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2>鲜花批零管理端</h2>
      <p class="tip">内网测试登录：输入测试账号 openid。正式上线应替换为小程序扫码授权登录。</p>
      <el-input v-model="openid" placeholder="请输入 openid" />
      <p class="accounts">测试账号：admin_platform（平台运营） / admin_supplier（批发商管理员）</p>
      <el-button type="primary" :loading="loading" style="width: 100%; margin-top: 12px" @click="onLogin">
        登录
      </el-button>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.login-card {
  width: 420px;
}
.tip {
  color: #86909c;
  font-size: 13px;
  line-height: 1.6;
}
.accounts {
  color: #e8543f;
  font-size: 12px;
  margin-top: 10px;
}
</style>
