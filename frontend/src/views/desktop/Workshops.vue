<template>
  <div class="workshops-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>厂房管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增厂房
          </el-button>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-bar">
        <el-input
          v-model="searchText"
          placeholder="搜索厂房编号、名称或地址"
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
      </div>

      <!-- 厂房列表 -->
      <el-table :data="workshopList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="code" label="厂房编号" width="120" />
        <el-table-column prop="name" label="厂房名称" width="200" />
        <el-table-column prop="address" label="地址" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="厂房编号" prop="code">
          <el-input v-model="formData.code" placeholder="请输入厂房编号" />
        </el-form-item>
        <el-form-item label="厂房名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入厂房名称" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="formData.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="formData.isActive" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import { workshopService, type Workshop, type CreateWorkshopDto } from '@/services/workshops';

const loading = ref(false);
const workshopList = ref<Workshop[]>([]);
const searchText = ref('');
const dialogVisible = ref(false);
const dialogTitle = ref('新增厂房');
const submitting = ref(false);
const formRef = ref();

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const formData = reactive<CreateWorkshopDto>({
  code: '',
  name: '',
  address: '',
  description: '',
  isActive: true,
});

const rules = {
  code: [{ required: true, message: '请输入厂房编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入厂房名称', trigger: 'blur' }],
};

let currentEditId: number | null = null;

const loadWorkshops = async () => {
  loading.value = true;
  try {
    const response = await workshopService.getList({
      page: pagination.page,
      limit: pagination.limit,
      search: searchText.value || undefined,
    });
    workshopList.value = response.data;
    pagination.total = response.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadWorkshops();
};

const handlePageChange = () => {
  loadWorkshops();
};

const handleSizeChange = () => {
  pagination.page = 1;
  loadWorkshops();
};

const handleAdd = () => {
  dialogTitle.value = '新增厂房';
  currentEditId = null;
  Object.assign(formData, {
    code: '',
    name: '',
    address: '',
    description: '',
    isActive: true,
  });
  dialogVisible.value = true;
};

const handleEdit = (row: Workshop) => {
  dialogTitle.value = '编辑厂房';
  currentEditId = row.id;
  Object.assign(formData, {
    code: row.code,
    name: row.name,
    address: row.address || '',
    description: row.description || '',
    isActive: row.isActive,
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
          await workshopService.update(currentEditId, formData);
          ElMessage.success('更新成功');
        } else {
          await workshopService.create(formData);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadWorkshops();
      } catch (error: any) {
        console.error('保存厂房失败:', error);
        const errorMessage = error.response?.data?.message || error.message || '操作失败';
        ElMessage.error(errorMessage);
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleDelete = async (row: Workshop) => {
  try {
    await ElMessageBox.confirm('确定要删除该厂房吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await workshopService.delete(row.id);
    ElMessage.success('删除成功');
    loadWorkshops();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
};

const handleDialogClose = () => {
  formRef.value?.resetFields();
  currentEditId = null;
};

onMounted(() => {
  loadWorkshops();
});
</script>

<style scoped>
.workshops-container {
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

