<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

interface SupplierItem {
  id: string;
  tenantId: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  status: number;
}

const list = ref<SupplierItem[]>([]);
const visible = ref(false);
const form = ref({ name: '', contactName: '', contactPhone: '' });

async function load(): Promise<void> {
  list.value = (await request.get('/admin/suppliers')) as SupplierItem[];
}
onMounted(load);

async function create(): Promise<void> {
  await request.post('/admin/suppliers', form.value);
  visible.value = false;
  ElMessage.success('批发商创建成功');
  form.value = { name: '', contactName: '', contactPhone: '' };
  await load();
}

async function toggle(row: SupplierItem): Promise<void> {
  await request.put(`/admin/suppliers/${row.id}/status`, { status: row.status === 1 ? 0 : 1 });
  ElMessage.success('状态已更新');
  await load();
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>批发商管理（多批发商入驻预留）</span>
        <el-button type="primary" size="small" @click="visible = true">新建批发商</el-button>
      </div>
    </template>

    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="name" label="批发商名称" min-width="160" />
      <el-table-column prop="tenantId" label="租户ID" width="120" />
      <el-table-column prop="contactName" label="联系人" width="140" />
      <el-table-column prop="contactPhone" label="联系电话" width="150" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="toggle(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="list.length === 0" description="暂无批发商" />
  </el-card>

  <el-dialog v-model="visible" title="新建批发商" width="440px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="联系人">
        <el-input v-model="form.contactName" />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input v-model="form.contactPhone" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="create">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
