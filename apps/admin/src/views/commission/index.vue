<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

interface RuleItem {
  id: string;
  dimension: string;
  targetValue: string;
  rate: number;
  priority: number;
  mutexGroup: string;
}

const list = ref<RuleItem[]>([]);
const ruleVisible = ref(false);
const editing = ref(false);
const currentId = ref('');

function emptyRule() {
  return { dimension: 'CATEGORY', targetValue: '', rate: 0, priority: 0, mutexGroup: '' };
}
const ruleForm = ref(emptyRule());

const dimensionOptions = [
  { label: '商品品类', value: 'CATEGORY' },
  { label: '商品', value: 'PRODUCT' },
  { label: '门店', value: 'SHOP' },
  { label: '批发商', value: 'SUPPLIER' },
  { label: '全局', value: 'GLOBAL' },
];

async function load(): Promise<void> {
  list.value = (await request.get('/admin/commission-rules')) as RuleItem[];
}
onMounted(load);

function openCreate(): void {
  editing.value = false;
  ruleForm.value = emptyRule();
  ruleVisible.value = true;
}
function openEdit(row: RuleItem): void {
  editing.value = true;
  currentId.value = row.id;
  ruleForm.value = {
    dimension: row.dimension ?? 'CATEGORY',
    targetValue: row.targetValue ?? '',
    rate: row.rate ?? 0,
    priority: row.priority ?? 0,
    mutexGroup: row.mutexGroup ?? '',
  };
  ruleVisible.value = true;
}

async function saveRule(): Promise<void> {
  if (ruleForm.value.rate < 0 || ruleForm.value.rate > 1) {
    ElMessage.error('比例必须在 0~1 之间');
    return;
  }
  if (editing.value) {
    await request.put(`/admin/commission-rules/${currentId.value}`, ruleForm.value);
    ElMessage.success('规则更新成功');
  } else {
    await request.post('/admin/commission-rules', ruleForm.value);
    ElMessage.success('规则创建成功');
  }
  ruleVisible.value = false;
  await load();
}

/** 分账配置：分账模式比例 >30% 必须转人工。 */
interface SettlementConfig {
  shopId: string;
  mode: 'SPLIT' | 'MANUAL';
  deliveryFeeInvolved: boolean;
}
const configShopId = ref('');
const config = ref<SettlementConfig>({ shopId: '', mode: 'MANUAL', deliveryFeeInvolved: false });

watch(configShopId, (val) => {
  if (val) void loadConfig();
});

async function loadConfig(): Promise<void> {
  const data = (await request.get(`/admin/settlement-configs/${configShopId.value}`)) as Partial<SettlementConfig>;
  config.value = {
    shopId: configShopId.value,
    mode: data?.mode === 'SPLIT' ? 'SPLIT' : 'MANUAL',
    deliveryFeeInvolved: Boolean(data?.deliveryFeeInvolved),
  };
}

/** 检查是否存在分账模式下比例超过 30% 的规则。 */
function overLimitRule(): RuleItem | undefined {
  return list.value.find((r) => Number(r.rate) > 0.3);
}

async function saveConfig(): Promise<void> {
  if (!configShopId.value) {
    ElMessage.error('请先输入门店ID');
    return;
  }
  if (config.value.mode === 'SPLIT' && overLimitRule()) {
    ElMessage.error('分账模式下存在比例超过 30% 的规则，必须切换为人工模式');
    return;
  }
  await request.put(`/admin/settlement-configs/${configShopId.value}`, {
    mode: config.value.mode,
    deliveryFeeInvolved: config.value.deliveryFeeInvolved,
  });
  ElMessage.success('分账配置保存成功');
}
</script>

<template>
  <div>
    <el-card>
      <template #header>
        <div class="table-header">
          <span>抽成规则（比例 0~1）</span>
          <el-button type="primary" size="small" @click="openCreate">新增规则</el-button>
        </div>
      </template>

      <el-alert
        type="warning"
        :closable="false"
        title="分账模式下比例超过 30% 的规则必须转人工处理，否则无法保存分账配置。"
        show-icon
        style="margin-bottom: 12px"
      />

      <el-table :data="list" border style="width: 100%">
        <el-table-column prop="dimension" label="维度" width="140">
          <template #default="{ row }">
            {{ dimensionOptions.find((d) => d.value === row.dimension)?.label ?? row.dimension ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="targetValue" label="目标值" min-width="140">
          <template #default="{ row }">{{ row.targetValue ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="rate" label="比例" width="110">
          <template #default="{ row }">
            <span :class="Number(row.rate) > 0.3 ? 'danger-text' : ''">
              {{ row.rate ?? '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">{{ row.priority ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="mutexGroup" label="互斥组" width="140">
          <template #default="{ row }">{{ row.mutexGroup ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="list.length === 0" description="暂无抽成规则" />
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header><span>分账配置</span></template>
      <div class="form-row">
        <el-input v-model="configShopId" placeholder="输入门店ID查询配置" style="width: 220px" />
        <el-button @click="loadConfig" :disabled="!configShopId">查询</el-button>
      </div>
      <el-divider />
      <el-form :model="config" label-width="160px" style="max-width: 520px">
        <el-form-item label="结算模式">
          <el-radio-group v-model="config.mode">
            <el-radio value="SPLIT">分账</el-radio>
            <el-radio value="MANUAL">人工</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="配送费是否参与抽成">
          <el-switch v-model="config.deliveryFeeInvolved" />
        </el-form-item>
        <el-form-item>
          <el-alert
            v-if="config.mode === 'SPLIT' && overLimitRule()"
            type="error"
            :closable="false"
            title="当前存在比例超过 30% 的规则，禁止分账，必须转人工模式"
            show-icon
          />
          <el-button type="primary" @click="saveConfig">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog v-model="ruleVisible" :title="editing ? '编辑抽成规则' : '新增抽成规则'" width="480px">
      <el-form :model="ruleForm" label-width="100px">
        <el-form-item label="维度">
          <el-select v-model="ruleForm.dimension" style="width: 100%">
            <el-option v-for="d in dimensionOptions" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标值"><el-input v-model="ruleForm.targetValue" /></el-form-item>
        <el-form-item label="比例(0~1)">
          <el-input-number v-model="ruleForm.rate" :min="0" :max="1" :precision="3" :step="0.05" />
        </el-form-item>
        <el-form-item label="优先级"><el-input-number v-model="ruleForm.priority" :min="0" /></el-form-item>
        <el-form-item label="互斥组"><el-input v-model="ruleForm.mutexGroup" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">确定</el-button>
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
}
.danger-text {
  color: #f56c6c;
  font-weight: 600;
}
</style>
