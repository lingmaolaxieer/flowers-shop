<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

interface OrderItem {
  id: string;
  orderNo: string;
  shopName?: string;
  amount?: number;
  status: string;
  createdAt?: string;
}

const list = ref<OrderItem[]>([]);
const afterSaleVisible = ref(false);
const currentOrderId = ref('');
const afterSaleForm = ref({ reason: '', amount: 0, type: 'REFUND' });

async function load(): Promise<void> {
  list.value = (await request.get('/admin/orders')) as OrderItem[];
}
onMounted(load);

const actions: { key: string; label: string; endpoint: string; type?: string }[] = [
  { key: 'accept', label: '接单', endpoint: 'accept', type: 'primary' },
  { key: 'pick', label: '配货', endpoint: 'pick' },
  { key: 'ship', label: '出货', endpoint: 'ship' },
  { key: 'deliver', label: '配送', endpoint: 'deliver' },
  { key: 'complete', label: '完成', endpoint: 'complete', type: 'success' },
];

async function doAction(row: OrderItem, action: (typeof actions)[number]): Promise<void> {
  await ElMessageBox.confirm(`确认对订单 ${row.orderNo ?? row.id} 执行「${action.label}」？`, '提示', {
    type: 'warning',
  });
  await request.post(`/admin/orders/${row.id}/${action.endpoint}`);
  ElMessage.success(`${action.label}成功`);
  await load();
}

function openAfterSale(row: OrderItem): void {
  currentOrderId.value = row.id;
  afterSaleForm.value = { reason: '', amount: 0, type: 'REFUND' };
  afterSaleVisible.value = true;
}

async function submitAfterSale(): Promise<void> {
  await request.post(`/admin/orders/${currentOrderId.value}/after-sale`, afterSaleForm.value);
  ElMessage.success('售后申请已提交');
  afterSaleVisible.value = false;
  await load();
}

function statusType(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'warning',
    ACCEPTED: 'primary',
    PICKED: 'primary',
    SHIPPED: 'primary',
    DELIVERING: 'primary',
    COMPLETED: 'success',
    AFTER_SALE: 'danger',
  };
  return map[status] ?? 'info';
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>订单管理</span>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
    </template>

    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="orderNo" label="订单号" min-width="180">
        <template #default="{ row }">{{ row.orderNo ?? row.id ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="shopName" label="门店" min-width="140">
        <template #default="{ row }">{{ row.shopName ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="120">
        <template #default="{ row }">{{ row.amount ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status ?? '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">{{ row.createdAt ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="440" fixed="right">
        <template #default="{ row }">
          <el-button
            v-for="action in actions"
            :key="action.key"
            size="small"
            :type="action.type"
            @click="doAction(row, action)"
          >
            {{ action.label }}
          </el-button>
          <el-button size="small" type="danger" plain @click="openAfterSale(row)">售后</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="list.length === 0" description="暂无订单" />
  </el-card>

  <el-dialog v-model="afterSaleVisible" title="售后处理" width="460px">
    <el-form :model="afterSaleForm" label-width="90px">
      <el-form-item label="类型">
        <el-select v-model="afterSaleForm.type" style="width: 100%">
          <el-option label="退款" value="REFUND" />
          <el-option label="退货退款" value="RETURN" />
          <el-option label="补发" value="RESEND" />
        </el-select>
      </el-form-item>
      <el-form-item label="金额">
        <el-input-number v-model="afterSaleForm.amount" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="原因">
        <el-input v-model="afterSaleForm.reason" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="afterSaleVisible = false">取消</el-button>
      <el-button type="primary" @click="submitAfterSale">提交</el-button>
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
