<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

type TabName = 'daily' | 'shopSpecific' | 'tier' | 'level';

const activeTab = ref<TabName>('daily');

const dailyList = ref<Record<string, unknown>[]>([]);
const dailyForm = ref({ productId: '', date: '', price: 0 });

const shopForm = ref({ shopId: '', productId: '', price: 0 });
const tierForm = ref({ productId: '', minQuantity: 0, price: 0 });
const levelForm = ref({ productId: '', customerLevel: '', price: 0 });

async function loadDaily(): Promise<void> {
  dailyList.value = (await request.get('/admin/prices/daily')) as Record<string, unknown>[];
}
onMounted(loadDaily);

async function onTabChange(tab: TabName): Promise<void> {
  activeTab.value = tab;
  if (tab === 'daily') await loadDaily();
}

/** 按当前 Tab 选择提交端点。 */
function endpointFor(tab: TabName): string {
  const map: Record<TabName, string> = {
    daily: '/admin/prices/daily',
    shopSpecific: '/admin/prices/shop-specific',
    tier: '/admin/prices/tier',
    level: '/admin/prices/level',
  };
  return map[tab];
}

async function submit(form: Record<string, unknown>, tab: TabName, reset: () => void): Promise<void> {
  await request.post(endpointFor(tab), form);
  ElMessage.success('价格保存成功');
  reset();
  if (tab === 'daily') await loadDaily();
}

async function saveDaily(): Promise<void> {
  await submit({ ...dailyForm.value }, 'daily', () => {
    dailyForm.value = { productId: '', date: '', price: 0 };
  });
}

async function saveShop(): Promise<void> {
  await submit({ ...shopForm.value }, 'shopSpecific', () => {
    shopForm.value = { shopId: '', productId: '', price: 0 };
  });
}

async function saveTier(): Promise<void> {
  await submit({ ...tierForm.value }, 'tier', () => {
    tierForm.value = { productId: '', minQuantity: 0, price: 0 };
  });
}

async function saveLevel(): Promise<void> {
  await submit({ ...levelForm.value }, 'level', () => {
    levelForm.value = { productId: '', customerLevel: '', price: 0 };
  });
}
</script>

<template>
  <el-card>
    <template #header><span>价格管理</span></template>

    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="每日价" name="daily">
        <div class="form-row">
          <el-input v-model="dailyForm.productId" placeholder="商品ID" style="width: 160px" />
          <el-date-picker
            v-model="dailyForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="生效日期"
            style="width: 170px"
          />
          <el-input-number v-model="dailyForm.price" :min="0" :precision="2" placeholder="价格" />
          <el-button type="primary" @click="saveDaily">保存</el-button>
        </div>
        <el-table :data="dailyList" border style="width: 100%; margin-top: 12px">
          <el-table-column prop="productName" label="商品" min-width="160">
            <template #default="{ row }">{{ row.productName ?? row.productId ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="date" label="日期" width="140">
            <template #default="{ row }">{{ row.date ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="price" label="价格" width="120">
            <template #default="{ row }">{{ row.price ?? '-' }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="一店一价" name="shopSpecific">
        <el-alert type="info" :closable="false" title="为指定花店设置专属价格，提交至 /admin/prices/shop-specific" show-icon style="margin-bottom: 12px" />
        <div class="form-row">
          <el-input v-model="shopForm.shopId" placeholder="门店ID" style="width: 160px" />
          <el-input v-model="shopForm.productId" placeholder="商品ID" style="width: 160px" />
          <el-input-number v-model="shopForm.price" :min="0" :precision="2" placeholder="专属价" />
          <el-button type="primary" @click="saveShop">保存</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="阶梯价" name="tier">
        <el-alert type="info" :closable="false" title="按起批量设置阶梯价格，提交至 /admin/prices/tier" show-icon style="margin-bottom: 12px" />
        <div class="form-row">
          <el-input v-model="tierForm.productId" placeholder="商品ID" style="width: 160px" />
          <el-input-number v-model="tierForm.minQuantity" :min="0" placeholder="起批量" />
          <el-input-number v-model="tierForm.price" :min="0" :precision="2" placeholder="单价" />
          <el-button type="primary" @click="saveTier">保存</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="等级价" name="level">
        <el-alert type="info" :closable="false" title="按客户等级设置价格，提交至 /admin/prices/level" show-icon style="margin-bottom: 12px" />
        <div class="form-row">
          <el-input v-model="levelForm.productId" placeholder="商品ID" style="width: 160px" />
          <el-select v-model="levelForm.customerLevel" placeholder="客户等级" style="width: 160px">
            <el-option label="普通会员" value="NORMAL" />
            <el-option label="银卡会员" value="SILVER" />
            <el-option label="金卡会员" value="GOLD" />
            <el-option label="VIP" value="VIP" />
          </el-select>
          <el-input-number v-model="levelForm.price" :min="0" :precision="2" placeholder="等级价" />
          <el-button type="primary" @click="saveLevel">保存</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<style scoped>
.form-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
