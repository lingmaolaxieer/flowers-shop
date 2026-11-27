<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

interface InventoryItem {
  id: string;
  productId: string;
  productName?: string;
  shopId?: string;
  quantity: number;
  lockedQuantity?: number;
  warning?: number;
}
interface AlertItem {
  id: string;
  productId: string;
  productName?: string;
  quantity?: number;
  threshold?: number;
  confirmed?: number;
}

const list = ref<InventoryItem[]>([]);
const alerts = ref<AlertItem[]>([]);

const adjustVisible = ref(false);
const lossVisible = ref(false);
const adjustForm = ref({ productId: '', shopId: '', change: 0, reason: '' });
const lossForm = ref({ productId: '', shopId: '', quantity: 0, reason: '' });

async function load(): Promise<void> {
  list.value = (await request.get('/admin/inventory')) as InventoryItem[];
}
async function loadAlerts(): Promise<void> {
  alerts.value = (await request.get('/admin/inventory/alerts')) as AlertItem[];
}
onMounted(() => {
  void load();
  void loadAlerts();
});

function openAdjust(): void {
  adjustForm.value = { productId: '', shopId: '', change: 0, reason: '' };
  adjustVisible.value = true;
}
function openLoss(): void {
  lossForm.value = { productId: '', shopId: '', quantity: 0, reason: '' };
  lossVisible.value = true;
}

async function doAdjust(): Promise<void> {
  await request.post('/admin/inventory/adjust', adjustForm.value);
  ElMessage.success('库存调整成功');
  adjustVisible.value = false;
  await load();
}

async function doLoss(): Promise<void> {
  await request.post('/admin/inventory/loss', lossForm.value);
  ElMessage.success('损耗登记成功');
  lossVisible.value = false;
  await load();
}

async function confirmAlert(row: AlertItem): Promise<void> {
  await ElMessageBox.confirm(`确认处理库存提醒 ${row.productName ?? row.productId}？`, '提示', {
    type: 'warning',
  });
  await request.post(`/admin/inventory/alerts/${row.id}/confirm`);
  ElMessage.success('已确认');
  await loadAlerts();
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>库存管理</span>
        <div>
          <el-button size="small" @click="openLoss">损耗登记</el-button>
          <el-button type="primary" size="small" @click="openAdjust">库存调整</el-button>
        </div>
      </div>
    </template>

    <el-alert
      type="warning"
      :closable="false"
      title="损耗不自动回补：损耗登记只记录扣减，不会自动补充库存，请人工核对后另行调整。"
      show-icon
      style="margin-bottom: 16px"
    />

    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="productName" label="商品" min-width="160">
        <template #default="{ row }">{{ row.productName ?? row.productId ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="shopId" label="门店ID" width="140">
        <template #default="{ row }">{{ row.shopId ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="quantity" label="可用库存" width="120">
        <template #default="{ row }">{{ row.quantity ?? 0 }}</template>
      </el-table-column>
      <el-table-column prop="lockedQuantity" label="锁定库存" width="120">
        <template #default="{ row }">{{ row.lockedQuantity ?? 0 }}</template>
      </el-table-column>
      <el-table-column prop="warning" label="预警线" width="100">
        <template #default="{ row }">{{ row.warning ?? '-' }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="list.length === 0" description="暂无库存数据" />
  </el-card>

  <el-card style="margin-top: 16px">
    <template #header>
      <div class="table-header">
        <span>库存提醒</span>
        <el-button size="small" @click="loadAlerts">刷新</el-button>
      </div>
    </template>
    <el-table :data="alerts" border style="width: 100%">
      <el-table-column prop="productName" label="商品" min-width="160">
        <template #default="{ row }">{{ row.productName ?? row.productId ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="quantity" label="当前库存" width="120">
        <template #default="{ row }">{{ row.quantity ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="threshold" label="阈值" width="100">
        <template #default="{ row }">{{ row.threshold ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.confirmed ? 'success' : 'danger'" size="small">
            {{ row.confirmed ? '已确认' : '待处理' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" :disabled="Boolean(row.confirmed)" @click="confirmAlert(row)">
            人工确认
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="alerts.length === 0" description="暂无库存提醒" />
  </el-card>

  <el-dialog v-model="adjustVisible" title="库存调整" width="460px">
    <el-alert type="info" :closable="false" title="change 可正可负，正数入库、负数出库" show-icon style="margin-bottom: 12px" />
    <el-form :model="adjustForm" label-width="90px">
      <el-form-item label="商品ID"><el-input v-model="adjustForm.productId" /></el-form-item>
      <el-form-item label="门店ID"><el-input v-model="adjustForm.shopId" /></el-form-item>
      <el-form-item label="变动量"><el-input-number v-model="adjustForm.change" /></el-form-item>
      <el-form-item label="原因"><el-input v-model="adjustForm.reason" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="adjustVisible = false">取消</el-button>
      <el-button type="primary" @click="doAdjust">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="lossVisible" title="损耗登记" width="460px">
    <el-alert
      type="warning"
      :closable="false"
      title="损耗只记录扣减，不自动回补库存。"
      show-icon
      style="margin-bottom: 12px"
    />
    <el-form :model="lossForm" label-width="90px">
      <el-form-item label="商品ID"><el-input v-model="lossForm.productId" /></el-form-item>
      <el-form-item label="门店ID"><el-input v-model="lossForm.shopId" /></el-form-item>
      <el-form-item label="损耗数量"><el-input-number v-model="lossForm.quantity" :min="0" /></el-form-item>
      <el-form-item label="原因"><el-input v-model="lossForm.reason" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="lossVisible = false">取消</el-button>
      <el-button type="primary" @click="doLoss">确定</el-button>
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
