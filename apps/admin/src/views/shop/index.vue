<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

interface AuditItem {
  id: string;
  shopId: string;
  shopName: string;
  licenseNo: string;
  contactPhone: string;
  status: string;
  auditRemark: string | null;
  createdAt: string;
}

const list = ref<AuditItem[]>([]);
const statusFilter = ref('');

async function load(): Promise<void> {
  const url = statusFilter.value
    ? `/admin/shop-audits?status=${statusFilter.value}`
    : '/admin/shop-audits';
  list.value = (await request.get(url)) as AuditItem[];
}

onMounted(load);

async function approve(row: AuditItem): Promise<void> {
  await request.post(`/admin/shop-audits/${row.id}/approve`, {});
  ElMessage.success('已通过审核');
  await load();
}

async function reject(row: AuditItem): Promise<void> {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回申请', {
    inputType: 'textarea',
  });
  await request.post(`/admin/shop-audits/${row.id}/reject`, { remark: value });
  ElMessage.success('已驳回');
  await load();
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>店家入驻审核</span>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 160px" @change="load">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
      </div>
    </template>

    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="shopName" label="花店名称" min-width="140" />
      <el-table-column prop="licenseNo" label="营业执照号" min-width="160" />
      <el-table-column prop="contactPhone" label="联系电话" width="140" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="auditRemark" label="审核备注" min-width="160" />
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button type="success" size="small" @click="approve(row)">通过</el-button>
            <el-button type="danger" size="small" @click="reject(row)">驳回</el-button>
          </template>
          <span v-else class="muted">已处理</span>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="list.length === 0" description="暂无审核记录" />
  </el-card>
</template>

<style scoped>
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.muted {
  color: #86909c;
  font-size: 13px;
}
</style>
