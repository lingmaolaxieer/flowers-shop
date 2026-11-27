<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

interface PromotionItem {
  id: string;
  name: string;
  type: string;
  startDate?: string;
  endDate?: string;
  status?: number;
  discount?: number;
}

const typeOptions = [
  { label: '特价', value: 'SPECIAL' },
  { label: '预售', value: 'PRESALE' },
  { label: '套餐', value: 'BUNDLE' },
  { label: '优惠券', value: 'COUPON' },
  { label: '满减', value: 'FULL_REDUCTION' },
  { label: '起批量', value: 'MIN_QUANTITY' },
  { label: '会员价', value: 'MEMBER_PRICE' },
  { label: '积分', value: 'POINT' },
];

const list = ref<PromotionItem[]>([]);
const dialogVisible = ref(false);
const editing = ref(false);
const currentId = ref('');

function emptyPromotion() {
  return { name: '', type: 'SPECIAL', startDate: '', endDate: '', discount: 0, status: 1 };
}
const form = ref(emptyPromotion());

function typeLabel(value: string): string {
  return typeOptions.find((t) => t.value === value)?.label ?? value ?? '-';
}

async function load(): Promise<void> {
  list.value = (await request.get('/admin/promotions')) as PromotionItem[];
}
onMounted(load);

function openCreate(): void {
  editing.value = false;
  form.value = emptyPromotion();
  dialogVisible.value = true;
}
function openEdit(row: PromotionItem): void {
  editing.value = true;
  currentId.value = row.id;
  form.value = {
    name: row.name ?? '',
    type: row.type ?? 'SPECIAL',
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
    discount: row.discount ?? 0,
    status: row.status ?? 1,
  };
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (editing.value) {
    await request.put(`/admin/promotions/${currentId.value}`, form.value);
    ElMessage.success('活动更新成功');
  } else {
    await request.post('/admin/promotions', form.value);
    ElMessage.success('活动创建成功');
  }
  dialogVisible.value = false;
  await load();
}

async function remove(row: PromotionItem): Promise<void> {
  await ElMessageBox.confirm(`确认删除活动 ${row.name}？`, '提示', { type: 'warning' });
  await request.delete(`/admin/promotions/${row.id}`);
  ElMessage.success('已删除');
  await load();
}

/** 叠加互斥优先级 JSON 配置。 */
const ruleVisible = ref(false);
const ruleText = ref('{\n  "stackable": true,\n  "priority": ["PRESALE", "COUPON"],\n  "exclusiveGroups": [["SPECIAL", "MEMBER_PRICE"]]\n}');
async function saveRules(): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(ruleText.value);
  } catch {
    ElMessage.error('JSON 解析失败，请检查格式');
    return;
  }
  await request.post('/admin/promotion-rules', parsed);
  ElMessage.success('叠加互斥规则已保存');
  ruleVisible.value = false;
}

/** 营销试算。 */
const simulateVisible = ref(false);
const simulateForm = ref({ orderAmount: 0, promotionIds: '', productIds: '' });
const simulateResult = ref<Record<string, unknown> | null>(null);
function openSimulate(): void {
  simulateForm.value = { orderAmount: 0, promotionIds: '', productIds: '' };
  simulateResult.value = null;
  simulateVisible.value = true;
}
async function doSimulate(): Promise<void> {
  simulateResult.value = (await request.post('/admin/marketing/simulate', {
    orderAmount: simulateForm.value.orderAmount,
    promotionIds: simulateForm.value.promotionIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    productIds: simulateForm.value.productIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  })) as Record<string, unknown>;
  ElMessage.success('试算完成');
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>营销管理</span>
        <div>
          <el-button size="small" @click="ruleVisible = true">叠加互斥规则</el-button>
          <el-button size="small" @click="openSimulate">营销试算</el-button>
          <el-button type="primary" size="small" @click="openCreate">新建活动</el-button>
        </div>
      </div>
    </template>

    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="name" label="活动名称" min-width="160" />
      <el-table-column prop="type" label="活动类型" width="130">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="startDate" label="开始时间" width="150">
        <template #default="{ row }">{{ row.startDate ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="endDate" label="结束时间" width="150">
        <template #default="{ row }">{{ row.endDate ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="discount" label="优惠值" width="110">
        <template #default="{ row }">{{ row.discount ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" plain @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="list.length === 0" description="暂无营销活动" />
  </el-card>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑活动' : '新建活动'" width="500px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="活动名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="活动类型">
        <el-select v-model="form.type" style="width: 100%">
          <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="开始时间">
        <el-date-picker v-model="form.startDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker v-model="form.endDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
      </el-form-item>
      <el-form-item label="优惠值"><el-input-number v-model="form.discount" :min="0" :precision="2" /></el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="ruleVisible" title="叠加互斥优先级配置" width="600px">
    <el-alert
      type="info"
      :closable="false"
      title="以 JSON 配置活动叠加、互斥分组与优先级，保存至 POST /admin/promotion-rules"
      show-icon
      style="margin-bottom: 12px"
    />
    <el-input v-model="ruleText" type="textarea" :rows="12" />
    <template #footer>
      <el-button @click="ruleVisible = false">取消</el-button>
      <el-button type="primary" @click="saveRules">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="simulateVisible" title="营销试算" width="600px">
    <el-form :model="simulateForm" label-width="100px">
      <el-form-item label="订单金额">
        <el-input-number v-model="simulateForm.orderAmount" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="活动ID列表">
        <el-input v-model="simulateForm.promotionIds" placeholder="多个用逗号分隔" />
      </el-form-item>
      <el-form-item label="商品ID列表">
        <el-input v-model="simulateForm.productIds" placeholder="多个用逗号分隔" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="doSimulate">开始试算</el-button>
      </el-form-item>
    </el-form>
    <el-descriptions v-if="simulateResult" :column="2" border style="margin-top: 8px">
      <el-descriptions-item v-for="(val, key) in simulateResult" :key="key" :label="String(key)">
        {{ val ?? '-' }}
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<style scoped>
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
