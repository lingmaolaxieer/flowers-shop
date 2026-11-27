<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

interface StatementItem {
  id: string;
  statementNo?: string;
  shopId?: string;
  shopName?: string;
  periodStart?: string;
  periodEnd?: string;
  amount?: number;
  status: string;
  createdAt?: string;
}

const list = ref<StatementItem[]>([]);
const generateVisible = ref(false);
const generateForm = ref({ shopId: '', periodStart: '', periodEnd: '' });

async function load(): Promise<void> {
  list.value = (await request.get('/admin/settlement-statements')) as StatementItem[];
}
onMounted(load);

function openGenerate(): void {
  generateForm.value = { shopId: '', periodStart: '', periodEnd: '' };
  generateVisible.value = true;
}
async function generate(): Promise<void> {
  await request.post('/admin/settlement-statements/generate', generateForm.value);
  ElMessage.success('对账单生成成功');
  generateVisible.value = false;
  await load();
}

async function review(row: StatementItem): Promise<void> {
  await ElMessageBox.confirm(`确认审核对账单 ${row.statementNo ?? row.id}？`, '提示', { type: 'warning' });
  await request.post(`/admin/settlement-statements/${row.id}/review`);
  ElMessage.success('审核成功');
  await load();
}

async function exportStatement(row: StatementItem): Promise<void> {
  const res = await request.get(`/admin/settlement-statements/${row.id}/export`, {
    responseType: 'blob',
  });
  const blob = new Blob([res as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${row.statementNo ?? 'statement'}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success('导出已开始');
}

function statusType(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'info',
    GENERATED: 'warning',
    REVIEWED: 'success',
    EXPORTED: 'success',
  };
  return map[status] ?? 'info';
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>周期对账</span>
        <div>
          <el-button size="small" @click="load">刷新</el-button>
          <el-button type="primary" size="small" @click="openGenerate">生成对账单</el-button>
        </div>
      </div>
    </template>

    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="statementNo" label="对账单号" min-width="180">
        <template #default="{ row }">{{ row.statementNo ?? row.id ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="shopName" label="门店" min-width="140">
        <template #default="{ row }">{{ row.shopName ?? row.shopId ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="对账周期" min-width="220">
        <template #default="{ row }">
          {{ row.periodStart ?? '-' }} ~ {{ row.periodEnd ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="120">
        <template #default="{ row }">{{ row.amount ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status ?? '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="生成时间" width="170">
        <template #default="{ row }">{{ row.createdAt ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="review(row)">审核</el-button>
          <el-button size="small" @click="exportStatement(row)">导出</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="list.length === 0" description="暂无对账单" />
  </el-card>

  <el-dialog v-model="generateVisible" title="生成对账单" width="480px">
    <el-form :model="generateForm" label-width="90px">
      <el-form-item label="门店ID"><el-input v-model="generateForm.shopId" /></el-form-item>
      <el-form-item label="周期开始">
        <el-date-picker v-model="generateForm.periodStart" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="周期结束">
        <el-date-picker v-model="generateForm.periodEnd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="generateVisible = false">取消</el-button>
      <el-button type="primary" @click="generate">生成</el-button>
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
