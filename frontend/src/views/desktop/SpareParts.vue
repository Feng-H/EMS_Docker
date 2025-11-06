<template>
  <div class="spare-parts-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>备件管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增备件
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 备件列表 -->
        <el-tab-pane label="备件列表" name="parts">
          <div class="filter-bar">
        <el-input
          v-model="searchText"
          placeholder="搜索备件名称或编号"
          style="width: 300px"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button type="warning" @click="handleViewLowStock">查看低库存</el-button>
          </div>

          <el-table :data="partList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="partNo" label="备件编号" width="150" />
        <el-table-column prop="name" label="备件名称" width="200" />
        <el-table-column prop="brand" label="品牌" width="120" />
        <el-table-column prop="supplier" label="供应商" width="150" />
        <el-table-column prop="stockQty" label="库存数量" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.stockQty <= row.minStock ? 'red' : '' }">
              {{ row.stockQty }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="minStock" label="最低库存" width="120">
          <template #default="{ row }">
            {{ row.minStock }} {{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="location" label="存储位置" width="150" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[10, 20, 50]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
        </el-tab-pane>

        <!-- 旧件台账 -->
        <el-tab-pane label="旧件台账" name="oldParts">
          <div class="filter-bar">
            <el-input
              v-model="oldPartsSearchText"
              placeholder="搜索旧件名称、编号、设备名称或设备编号"
              style="width: 300px"
              clearable
              @clear="handleOldPartsSearch"
              @keyup.enter="handleOldPartsSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="handleOldPartsSearch">搜索</el-button>
          </div>

          <el-table :data="oldPartsList" v-loading="oldPartsLoading" style="width: 100%; margin-top: 20px">
            <el-table-column prop="partNo" label="备件编号" width="150" />
            <el-table-column prop="name" label="备件名称" width="200" />
            <el-table-column prop="supplier" label="供应商" width="150" />
            <el-table-column label="数量" width="120">
              <template #default="{ row }">
                {{ row.qty }} {{ row.unit }}
              </template>
            </el-table-column>
            <el-table-column label="设备" width="200">
              <template #default="{ row }">
                <div v-if="row.device">
                  <div style="font-weight: 500">{{ row.device.name }}</div>
                  <div style="font-size: 12px; color: #909399; margin-top: 4px">编号：{{ row.device.assetNo }}</div>
                </div>
                <span v-else style="color: #909399">未关联设备</span>
              </template>
            </el-table-column>
            <el-table-column prop="workOrder.orderNo" label="工单号" width="150" />
            <el-table-column prop="notes" label="备注" min-width="200" show-overflow-tooltip />
            <el-table-column prop="created_at" label="创建时间" width="180" />
          </el-table>

          <el-pagination
            v-model:current-page="oldPartsPagination.page"
            v-model:page-size="oldPartsPagination.limit"
            :page-sizes="[10, 20, 50]"
            :total="oldPartsPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            style="margin-top: 20px; justify-content: flex-end"
            @size-change="handleOldPartsSizeChange"
            @current-change="handleOldPartsPageChange"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="备件编号" prop="partNo">
          <el-input v-model="formData.partNo" placeholder="请输入备件编号" />
        </el-form-item>
        <el-form-item label="备件名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入备件名称" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="formData.supplier" placeholder="请输入供应商" />
        </el-form-item>
        <el-form-item label="品牌">
          <el-input v-model="formData.brand" placeholder="请输入品牌" />
        </el-form-item>
        <el-form-item label="库存数量">
          <el-input-number v-model="formData.stockQty" :min="0" />
        </el-form-item>
        <el-form-item label="最低库存">
          <el-input-number v-model="formData.minStock" :min="0" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-select v-model="formData.unit" placeholder="请选择单位" style="width: 100%">
            <el-option label="pc（个）" value="pc" />
            <el-option label="set（套）" value="set" />
            <el-option label="m（米）" value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="存储位置">
          <el-input v-model="formData.location" placeholder="请输入存储位置" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import { sparePartService, type SparePart } from '@/services/spareParts';

const activeTab = ref('parts');
const loading = ref(false);
const partList = ref<SparePart[]>([]);
const searchText = ref('');
const dialogVisible = ref(false);
const dialogTitle = ref('新增备件');
const submitting = ref(false);
const formRef = ref();

// 旧件台账相关
const oldPartsLoading = ref(false);
const oldPartsList = ref<any[]>([]);
const oldPartsSearchText = ref('');

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const oldPartsPagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const formData = reactive({
  partNo: '',
  name: '',
  supplier: '',
  brand: '',
  stockQty: 0,
  minStock: 0,
  unit: 'pc',
  location: '',
});

const rules = {
  partNo: [{ required: true, message: '请输入备件编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入备件名称', trigger: 'blur' }],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
};

let currentEditId: number | null = null;

const loadParts = async () => {
  loading.value = true;
  try {
    const response = await sparePartService.getList({
      page: pagination.page,
      limit: pagination.limit,
      search: searchText.value || undefined,
    });
    partList.value = response.data;
    pagination.total = response.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadParts();
};

const handlePageChange = () => {
  loadParts();
};

const handleSizeChange = () => {
  pagination.page = 1;
  loadParts();
};

const handleTabChange = (tabName: string) => {
  if (tabName === 'oldParts') {
    loadOldParts();
  }
};

// 旧件台账相关方法
const loadOldParts = async () => {
  oldPartsLoading.value = true;
  try {
    const response = await sparePartService.getOldParts({
      page: oldPartsPagination.page,
      limit: oldPartsPagination.limit,
      search: oldPartsSearchText.value || undefined,
    });
    oldPartsList.value = response.data;
    oldPartsPagination.total = response.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    oldPartsLoading.value = false;
  }
};

const handleOldPartsSearch = () => {
  oldPartsPagination.page = 1;
  loadOldParts();
};

const handleOldPartsPageChange = () => {
  loadOldParts();
};

const handleOldPartsSizeChange = () => {
  oldPartsPagination.page = 1;
  loadOldParts();
};

const handleAdd = () => {
  dialogTitle.value = '新增备件';
  currentEditId = null;
  Object.assign(formData, {
    partNo: '',
    name: '',
    supplier: '',
    brand: '',
    stockQty: 0,
    minStock: 0,
    unit: 'pc',
    location: '',
  });
  dialogVisible.value = true;
};

const handleEdit = (row: SparePart) => {
  dialogTitle.value = '编辑备件';
  currentEditId = row.id;
  Object.assign(formData, {
    partNo: row.partNo,
    name: row.name,
    supplier: row.supplier || '',
    brand: row.brand || '',
    stockQty: row.stockQty,
    minStock: row.minStock,
    unit: row.unit || 'pc',
    location: row.location || '',
  });
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true;
      try {
        if (currentEditId) {
          await sparePartService.update(currentEditId, formData);
          ElMessage.success('更新成功');
        } else {
          await sparePartService.create(formData);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadParts();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleDelete = async (row: SparePart) => {
  try {
    await ElMessageBox.confirm('确定要删除该备件吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    await sparePartService.delete(row.id);
    ElMessage.success('删除成功');
    loadParts();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
};

const handleViewLowStock = async () => {
  try {
    const lowStockParts = await sparePartService.getLowStock();
    if (lowStockParts.length === 0) {
      ElMessage.success('没有低库存备件');
    } else {
      ElMessage.warning(`有 ${lowStockParts.length} 个备件库存不足`);
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '查询失败');
  }
};

onMounted(() => {
  loadParts();
});
</script>

<style scoped>
.spare-parts-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
</style>
