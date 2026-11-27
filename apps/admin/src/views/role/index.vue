<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

interface RoleItem {
  id: string;
  roleCode: string;
  name: string;
  scope: string;
  preset: boolean;
  status: number;
}
interface PermItem {
  id: string;
  permCode: string;
  module: string;
  action: string;
}

const roles = ref<RoleItem[]>([]);
const perms = ref<PermItem[]>([]);
const createVisible = ref(false);
const permVisible = ref(false);
const currentRoleId = ref('');
const currentRoleName = ref('');
const checkedPerms = ref<string[]>([]);
const form = ref({ roleCode: '', name: '', scope: 'supplier' });

async function load(): Promise<void> {
  roles.value = (await request.get('/admin/roles')) as RoleItem[];
  perms.value = (await request.get('/admin/permissions')) as PermItem[];
}
onMounted(load);

async function createRole(): Promise<void> {
  await request.post('/admin/roles', form.value);
  createVisible.value = false;
  ElMessage.success('角色创建成功');
  form.value = { roleCode: '', name: '', scope: 'supplier' };
  await load();
}

function openPermDialog(row: RoleItem): void {
  if (row.preset) {
    ElMessage.warning('平台预置角色不允许修改权限');
    return;
  }
  currentRoleId.value = row.id;
  currentRoleName.value = row.name;
  checkedPerms.value = [];
  permVisible.value = true;
}

async function savePerms(): Promise<void> {
  await request.post(`/admin/roles/${currentRoleId.value}/perms`, {
    permCodes: checkedPerms.value,
  });
  permVisible.value = false;
  ElMessage.success('权限已更新');
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>角色与权限配置</span>
        <el-button type="primary" size="small" @click="createVisible = true">新建角色</el-button>
      </div>
    </template>

    <el-table :data="roles" border style="width: 100%">
      <el-table-column prop="roleCode" label="角色编码" min-width="180" />
      <el-table-column prop="name" label="角色名称" min-width="140" />
      <el-table-column prop="scope" label="作用域" width="120" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.preset ? 'info' : 'success'" size="small">
            {{ row.preset ? '平台预置' : '自定义' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :disabled="row.preset" @click="openPermDialog(row)">配置权限</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="createVisible" title="新建角色" width="440px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="角色编码">
        <el-input v-model="form.roleCode" placeholder="如 SHOP_BUYER" />
      </el-form-item>
      <el-form-item label="角色名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="作用域">
        <el-select v-model="form.scope" style="width: 100%">
          <el-option label="平台" value="platform" />
          <el-option label="批发商" value="supplier" />
          <el-option label="花店" value="shop" />
          <el-option label="个人" value="personal" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createVisible = false">取消</el-button>
      <el-button type="primary" @click="createRole">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="permVisible" :title="`配置权限 - ${currentRoleName}`" width="560px">
    <el-checkbox-group v-model="checkedPerms">
      <div v-for="perm in perms" :key="perm.id" class="perm-row">
        <el-checkbox :value="perm.permCode">
          {{ perm.module }} : {{ perm.action }}
        </el-checkbox>
      </div>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="permVisible = false">取消</el-button>
      <el-button type="primary" @click="savePerms">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.perm-row {
  padding: 6px 0;
}
</style>
