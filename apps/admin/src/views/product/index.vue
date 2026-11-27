<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  grade: string;
  unit: string;
  wholesalePrice?: number | null;
  status: number;
}

const list = ref<ProductItem[]>([]);
const dialogVisible = ref(false);
const editing = ref(false);
const importVisible = ref(false);
const importText = ref('');
const importing = ref(false);
const currentId = ref('');

const form = ref({
  name: '',
  category: '',
  grade: '',
  unit: '',
  wholesalePrice: 0,
  status: 1,
});

function resetForm(): void {
  form.value = { name: '', category: '', grade: '', unit: '', wholesalePrice: 0, status: 1 };
  currentId.value = '';
}

async function load(): Promise<void> {
  list.value = (await request.get('/admin/products')) as ProductItem[];
}
onMounted(load);

function openCreate(): void {
  editing.value = false;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: ProductItem): void {
  editing.value = true;
  currentId.value = row.id;
  form.value = {
    name: row.name ?? '',
    category: row.category ?? '',
    grade: row.grade ?? '',
    unit: row.unit ?? '',
    wholesalePrice: row.wholesalePrice ?? 0,
    status: row.status ?? 1,
  };
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (editing.value) {
    await request.put(`/admin/products/${currentId.value}`, form.value);
    ElMessage.success('商品更新成功');
  } else {
    await request.post('/admin/products', form.value);
    ElMessage.success('商品创建成功');
  }
  dialogVisible.value = false;
  await load();
}

function openImport(): void {
  importText.value = '';
  importVisible.value = true;
}

async function doImport(): Promise<void> {
  let payload: unknown;
  try {
    payload = JSON.parse(importText.value);
  } catch {
    ElMessage.error('JSON 解析失败，请检查格式');
    return;
  }
  if (!Array.isArray(payload)) {
    ElMessage.error('请输入 JSON 数组');
    return;
  }
  importing.value = true;
  try {
    await request.post('/admin/products/import', payload);
    ElMessage.success(`成功导入 ${payload.length} 条商品`);
    importVisible.value = false;
    await load();
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="table-header">
        <span>商品管理</span>
        <div>
          <el-button size="small" @click="openImport">批量导入</el-button>
          <el-button type="primary" size="small" @click="openCreate">新增商品</el-button>
        </div>
      </div>
    </template>

    <el-table :data="list" border style="width: 100%">
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="category" label="品种" min-width="120" />
      <el-table-column prop="grade" label="等级" width="100" />
      <el-table-column prop="unit" label="单位" width="90" />
      <el-table-column label="批发价" width="120">
        <template #default="{ row }">
          <span v-if="row.wholesalePrice !== null && row.wholesalePrice !== undefined">
            {{ row.wholesalePrice }}
          </span>
          <span v-else>-</span>
        </template>
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
    <el-empty v-if="list.length === 0" description="暂无商品" />
  </el-card>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑商品' : '新增商品'" width="480px">
    <el-form :model="form" label-width="90px">
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="品种">
        <el-input v-model="form.category" />
      </el-form-item>
      <el-form-item label="等级">
        <el-input v-model="form.grade" />
      </el-form-item>
      <el-form-item label="单位">
        <el-input v-model="form.unit" />
      </el-form-item>
      <el-form-item label="批发价">
        <el-input-number v-model="form.wholesalePrice" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="importVisible" title="批量导入商品" width="560px">
    <el-alert
      type="info"
      :closable="false"
      title="请输入 JSON 数组，每个元素为一个商品对象，例如：[{\"name\":\"玫瑰\",\"category\":\"鲜花\",\"unit\":\"枝\"}]"
      show-icon
      style="margin-bottom: 12px"
    />
    <el-input
      v-model="importText"
      type="textarea"
      :rows="10"
      placeholder='[{"name":"玫瑰","category":"鲜花","grade":"A","unit":"枝"}]'
    />
    <template #footer>
      <el-button @click="importVisible = false">取消</el-button>
      <el-button type="primary" :loading="importing" @click="doImport">导入</el-button>
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
