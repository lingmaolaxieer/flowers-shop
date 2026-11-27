<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

interface AreaItem {
  id: string;
  name: string;
  code?: string;
  baseFee?: number;
  perKgFee?: number;
  freeThreshold?: number;
  status?: number;
}

const areas = ref<AreaItem[]>([]);
const areaVisible = ref(false);
const editing = ref(false);
const currentId = ref('');

function emptyArea() {
  return { name: '', code: '', baseFee: 0, perKgFee: 0, freeThreshold: 0, status: 1 };
}
const areaForm = ref(emptyArea());

async function loadAreas(): Promise<void> {
  areas.value = (await request.get('/admin/delivery-areas')) as AreaItem[];
}
onMounted(loadAreas);

function openCreate(): void {
  editing.value = false;
  areaForm.value = emptyArea();
  areaVisible.value = true;
}
function openEdit(row: AreaItem): void {
  editing.value = true;
  currentId.value = row.id;
  areaForm.value = {
    name: row.name ?? '',
    code: row.code ?? '',
    baseFee: row.baseFee ?? 0,
    perKgFee: row.perKgFee ?? 0,
    freeThreshold: row.freeThreshold ?? 0,
    status: row.status ?? 1,
  };
  areaVisible.value = true;
}

async function saveArea(): Promise<void> {
  if (editing.value) {
    await request.put(`/admin/delivery-areas/${currentId.value}`, areaForm.value);
    ElMessage.success('配送区域更新成功');
  } else {
    await request.post('/admin/delivery-areas', areaForm.value);
    ElMessage.success('配送区域创建成功');
  }
  areaVisible.value = false;
  await loadAreas();
}

const trackingVisible = ref(false);
const trackingForm = ref({ shipmentId: '', trackingNo: '', carrier: '' });

function openTracking(): void {
  trackingForm.value = { shipmentId: '', trackingNo: '', carrier: '' };
  trackingVisible.value = true;
}
async function saveTracking(): Promise<void> {
  await request.put(`/admin/shipments/${trackingForm.value.shipmentId}/tracking`, {
    trackingNo: trackingForm.value.trackingNo,
    carrier: trackingForm.value.carrier,
  });
  ElMessage.success('运单号已录入');
  trackingVisible.value = false;
}

const quoteForm = ref({ areaId: '', weight: 0, amount: 0 });
const quoteResult = ref<Record<string, unknown> | null>(null);
const quoting = ref(false);

async function doQuote(): Promise<void> {
  quoting.value = true;
  try {
    quoteResult.value = (await request.post('/delivery/quote', quoteForm.value)) as Record<string, unknown>;
    ElMessage.success('试算完成');
  } finally {
    quoting.value = false;
  }
}
</script>

<template>
  <div>
    <el-card>
      <template #header>
        <div class="table-header">
          <span>配送区域</span>
          <el-button type="primary" size="small" @click="openCreate">新增区域</el-button>
        </div>
      </template>

      <el-table :data="areas" border style="width: 100%">
        <el-table-column prop="name" label="区域名称" min-width="160" />
        <el-table-column prop="code" label="区域编码" width="140">
          <template #default="{ row }">{{ row.code ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="baseFee" label="基础费" width="110">
          <template #default="{ row }">{{ row.baseFee ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="perKgFee" label="每公斤费" width="110">
          <template #default="{ row }">{{ row.perKgFee ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="freeThreshold" label="满额减免" width="110">
          <template #default="{ row }">{{ row.freeThreshold ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="areas.length === 0" description="暂无配送区域" />
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header>
        <div class="table-header">
          <span>运单号录入</span>
          <el-button size="small" @click="openTracking">录入运单号</el-button>
        </div>
      </template>
      <el-alert
        type="info"
        :closable="false"
        title="填入运单ID后通过 PUT /admin/shipments/:id/tracking 录入运单号及承运商。"
        show-icon
      />
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header><span>配送费试算</span></template>
      <div class="form-row">
        <el-select v-model="quoteForm.areaId" placeholder="选择区域" style="width: 180px">
          <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
        <el-input-number v-model="quoteForm.weight" :min="0" :precision="2" placeholder="重量(kg)" />
        <el-input-number v-model="quoteForm.amount" :min="0" :precision="2" placeholder="订单金额" />
        <el-button type="primary" :loading="quoting" @click="doQuote">试算</el-button>
      </div>
      <el-descriptions v-if="quoteResult" :column="2" border style="margin-top: 16px; max-width: 640px">
        <el-descriptions-item v-for="(val, key) in quoteResult" :key="key" :label="String(key)">
          {{ val ?? '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="暂无试算结果" />
    </el-card>

    <el-dialog v-model="areaVisible" :title="editing ? '编辑配送区域' : '新增配送区域'" width="480px">
      <el-form :model="areaForm" label-width="100px">
        <el-form-item label="区域名称"><el-input v-model="areaForm.name" /></el-form-item>
        <el-form-item label="区域编码"><el-input v-model="areaForm.code" /></el-form-item>
        <el-form-item label="基础费"><el-input-number v-model="areaForm.baseFee" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="每公斤费"><el-input-number v-model="areaForm.perKgFee" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="满额减免"><el-input-number v-model="areaForm.freeThreshold" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="areaForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="areaVisible = false">取消</el-button>
        <el-button type="primary" @click="saveArea">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="trackingVisible" title="录入运单号" width="460px">
      <el-form :model="trackingForm" label-width="90px">
        <el-form-item label="运单ID"><el-input v-model="trackingForm.shipmentId" placeholder="运单记录ID" /></el-form-item>
        <el-form-item label="运单号"><el-input v-model="trackingForm.trackingNo" /></el-form-item>
        <el-form-item label="承运商"><el-input v-model="trackingForm.carrier" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="trackingVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTracking">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.form-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
