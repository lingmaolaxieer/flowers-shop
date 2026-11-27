<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

interface Column {
  label: string;
  key: string;
}

const reportTypes = [
  { label: '销售报表', value: 'sales' },
  { label: '库存损耗报表', value: 'inventory_loss' },
  { label: '抽成明细', value: 'commission_detail' },
  { label: '结算单报表', value: 'settlement_statement' },
  { label: '配送费明细', value: 'delivery_fee' },
  { label: '退款明细', value: 'refund_detail' },
  { label: '商品流转', value: 'product_turnover' },
  { label: '预售统计', value: 'presale_stats' },
];

/** 三类关键明细列头按需求写全；其余报表使用通用列。 */
const COLUMNS: Record<string, Column[]> = {
  sales: [
    { label: '订单号', key: 'orderNo' },
    { label: '门店', key: 'shopName' },
    { label: '商品', key: 'productName' },
    { label: '数量', key: 'quantity' },
    { label: '金额', key: 'amount' },
    { label: '下单时间', key: 'createdAt' },
  ],
  inventory_loss: [
    { label: '商品', key: 'productName' },
    { label: '门店', key: 'shopName' },
    { label: '损耗数量', key: 'quantity' },
    { label: '原因', key: 'reason' },
    { label: '登记时间', key: 'createdAt' },
  ],
  commission_detail: [
    { label: '订单号', key: 'orderNo' },
    { label: '订单金额', key: 'orderAmount' },
    { label: '配送费', key: 'deliveryFee' },
    { label: '维度', key: 'dimension' },
    { label: '比例', key: 'rate' },
    { label: '金额', key: 'amount' },
    { label: '模式标识', key: 'mode' },
    { label: '状态', key: 'status' },
  ],
  settlement_statement: [
    { label: '对账单号', key: 'statementNo' },
    { label: '门店', key: 'shopName' },
    { label: '周期', key: 'period' },
    { label: '金额', key: 'amount' },
    { label: '状态', key: 'status' },
  ],
  delivery_fee: [
    { label: '订单号', key: 'orderNo' },
    { label: '方式', key: 'method' },
    { label: '区域', key: 'area' },
    { label: '重量', key: 'weight' },
    { label: '金额加价', key: 'surcharge' },
    { label: '满额减免', key: 'discount' },
    { label: '实收', key: 'actualFee' },
    { label: '是否抽成', key: 'commissionIncluded' },
  ],
  refund_detail: [
    { label: '退款单号', key: 'refundNo' },
    { label: '原订单号', key: 'orderNo' },
    { label: '类型', key: 'type' },
    { label: '金额', key: 'amount' },
    { label: '库存状态', key: 'inventoryStatus' },
    { label: '分账回退状态', key: 'splitRollbackStatus' },
  ],
  product_turnover: [
    { label: '商品', key: 'productName' },
    { label: '入库', key: 'inQuantity' },
    { label: '出库', key: 'outQuantity' },
    { label: '结存', key: 'balance' },
    { label: '周转率', key: 'turnoverRate' },
  ],
  presale_stats: [
    { label: '活动', key: 'promotionName' },
    { label: '预订数量', key: 'reservedQuantity' },
    { label: '预订金额', key: 'reservedAmount' },
    { label: '完成数量', key: 'completedQuantity' },
  ],
};

const reportType = ref('sales');
const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const exporting = ref(false);
const exports = ref<Record<string, unknown>[]>([]);

const columns = () => COLUMNS[reportType.value] ?? [];

/** 统一用可选链容错，字段缺失显示 '-'。 */
function cell(row: Record<string, unknown> | undefined, key: string): unknown {
  return row?.[key] ?? '-';
}

async function loadReport(): Promise<void> {
  loading.value = true;
  try {
    rows.value = (await request.get(`/admin/reports/${reportType.value}`)) as Record<string, unknown>[];
  } catch {
    rows.value = [];
  } finally {
    loading.value = false;
  }
}
async function loadExports(): Promise<void> {
  exports.value = (await request.get('/admin/reports/exports')) as Record<string, unknown>[];
}
onMounted(() => {
  void loadReport();
  void loadExports();
});

async function doExport(): Promise<void> {
  exporting.value = true;
  try {
    await request.post(`/admin/reports/${reportType.value}/export`);
    ElMessage.success('导出任务已提交');
    await loadExports();
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div>
    <el-card>
      <template #header>
        <div class="table-header">
          <span>报表导出</span>
          <div>
            <el-select v-model="reportType" style="width: 180px" @change="loadReport">
              <el-option v-for="t in reportTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
            <el-button type="primary" size="small" :loading="exporting" @click="doExport">导出报表</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" border v-loading="loading" style="width: 100%">
        <el-table-column
          v-for="col in columns()"
          :key="col.key"
          :label="col.label"
          :prop="col.key"
          min-width="130"
        >
          <template #default="{ row }">{{ cell(row, col.key) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="rows.length === 0 && !loading" description="暂无报表数据" />
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header>
        <div class="table-header">
          <span>导出记录</span>
          <el-button size="small" @click="loadExports">刷新</el-button>
        </div>
      </template>
      <el-table :data="exports" border style="width: 100%">
        <el-table-column label="报表类型" min-width="150">
          <template #default="{ row }">
            {{ reportTypes.find((t) => t.value === row?.type)?.label ?? row?.type ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="文件名" min-width="220">
          <template #default="{ row }">{{ row?.fileName ?? row?.filename ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">{{ row?.status ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ row?.createdAt ?? '-' }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="exports.length === 0" description="暂无导出记录" />
    </el-card>
  </div>
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
