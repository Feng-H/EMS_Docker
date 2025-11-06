<template>
  <div class="devices-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备台账</span>
          <div>
            <el-button @click="handleDownloadTemplate">
              <el-icon><Download /></el-icon>
              下载模板
            </el-button>
            <el-button @click="handleImport">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
            <el-button @click="handleExport">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增设备
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-bar">
        <el-input
          v-model="searchText"
          placeholder="搜索设备名称、编号或型号"
          style="width: 300px"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="filterStatus" placeholder="设备状态" style="width: 150px" clearable @change="handleSearch">
          <el-option label="在用" value="in_use" />
          <el-option label="试运行" value="trial_run" />
          <el-option label="调试" value="debugging" />
          <el-option label="封存" value="sealed" />
          <el-option label="报废" value="scrapped" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>

      <!-- 设备列表 -->
      <el-table :data="deviceList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="assetNo" label="设备编号" width="120" />
        <el-table-column prop="name" label="设备名称" width="200" />
        <el-table-column prop="model" label="型号" width="150" />
        <el-table-column prop="brand" label="品牌" width="120" />
        <el-table-column prop="workshop.name" label="厂房" width="150" />
        <el-table-column prop="location" label="位置" width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="purchaseDate" label="采购日期" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[10, 20, 50, 100]"
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
        <el-form-item label="设备编号" prop="assetNo">
          <el-input v-model="formData.assetNo" placeholder="请输入设备编号" />
        </el-form-item>
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="formData.model" placeholder="请输入型号" />
        </el-form-item>
        <el-form-item label="品牌">
          <el-input v-model="formData.brand" placeholder="请输入品牌" />
        </el-form-item>
        <el-form-item label="厂房">
          <el-select
            v-model="formData.workshopId"
            placeholder="请选择厂房"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="workshop in workshopList"
              :key="workshop.id"
              :label="`${workshop.code} - ${workshop.name}`"
              :value="workshop.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="formData.location" placeholder="请输入位置（如：A区1号位）" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="formData.status" placeholder="请选择状态">
            <el-option label="在用" value="in_use" />
            <el-option label="试运行" value="trial_run" />
            <el-option label="调试" value="debugging" />
            <el-option label="封存" value="sealed" />
            <el-option label="报废" value="scrapped" />
          </el-select>
        </el-form-item>
        <el-form-item label="采购日期">
          <el-date-picker
            v-model="formData.purchaseDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="保修到期">
          <el-date-picker
            v-model="formData.warrantyUntil"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
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
import { Plus, Search, Download, Upload } from '@element-plus/icons-vue';
import { deviceService, type Device, type CreateDeviceDto } from '@/services/devices';
import { workshopService, type Workshop } from '@/services/workshops';

const loading = ref(false);
const deviceList = ref<Device[]>([]);
const searchText = ref('');
const filterStatus = ref('');
const workshopList = ref<Workshop[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref('新增设备');
const submitting = ref(false);
const formRef = ref();

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const formData = reactive<CreateDeviceDto>({
  assetNo: '',
  name: '',
  model: '',
  brand: '',
  workshopId: undefined,
  location: '',
  status: 'in_use' as string,
  purchaseDate: '',
  warrantyUntil: '',
});

const rules = {
  assetNo: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
};

let currentEditId: number | null = null;

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    in_use: '在用',
    trial_run: '试运行',
    debugging: '调试',
    sealed: '封存',
    scrapped: '报废',
  };
  return map[status] || status;
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    in_use: 'success',
    trial_run: 'warning',
    debugging: 'info',
    sealed: 'info',
    scrapped: 'danger',
  };
  return map[status] || '';
};

const loadDevices = async () => {
  loading.value = true;
  try {
    const response = await deviceService.getList({
      page: pagination.page,
      limit: pagination.limit,
      search: searchText.value || undefined,
      status: filterStatus.value || undefined,
    });
    deviceList.value = response.data;
    pagination.total = response.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载设备列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadDevices();
};

const handlePageChange = () => {
  loadDevices();
};

const handleSizeChange = () => {
  pagination.page = 1;
  loadDevices();
};

const loadWorkshops = async () => {
  try {
    workshopList.value = await workshopService.getActiveList();
  } catch (error: any) {
    console.error('加载厂房列表失败:', error);
  }
};

const handleAdd = () => {
  dialogTitle.value = '新增设备';
  currentEditId = null;
  Object.assign(formData, {
    assetNo: '',
    name: '',
    model: '',
    brand: '',
    workshopId: undefined,
    location: '',
    status: 'in_use' as string,
    purchaseDate: '',
    warrantyUntil: '',
  });
  dialogVisible.value = true;
};

const handleEdit = (row: Device) => {
  dialogTitle.value = '编辑设备';
  currentEditId = row.id;
  Object.assign(formData, {
    assetNo: row.assetNo,
    name: row.name,
    model: row.model || '',
    brand: row.brand || '',
    workshopId: row.workshopId,
    location: row.location || '',
    status: row.status,
    purchaseDate: row.purchaseDate || '',
    warrantyUntil: row.warrantyUntil || '',
  });
  dialogVisible.value = true;
};

const handleView = (row: Device) => {
  ElMessage.info('查看功能开发中...');
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true;
      try {
        // 清理数据：移除空字符串，转换为 undefined
        const submitData: any = {
          assetNo: formData.assetNo,
          name: formData.name,
          status: formData.status || 'in_use',
        };
        
        // 只添加非空的可选字段
        if (formData.model && formData.model.trim()) {
          submitData.model = formData.model.trim();
        }
        if (formData.brand && formData.brand.trim()) {
          submitData.brand = formData.brand.trim();
        }
        if (formData.purchaseDate) {
          submitData.purchaseDate = formData.purchaseDate;
        }
        if (formData.warrantyUntil) {
          submitData.warrantyUntil = formData.warrantyUntil;
        }
        if (formData.workshopId) {
          submitData.workshopId = formData.workshopId;
        }
        if (formData.location) {
          submitData.location = formData.location.trim();
        }
        
        if (currentEditId) {
          await deviceService.update(currentEditId, submitData);
          ElMessage.success('更新成功');
        } else {
          await deviceService.create(submitData);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadDevices();
      } catch (error: any) {
        console.error('保存设备失败:', error);
        const errorMessage = error.response?.data?.message || error.message || '操作失败';
        ElMessage.error(errorMessage);
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleDelete = async (row: Device) => {
  try {
    await ElMessageBox.confirm('确定要删除该设备吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    await deviceService.delete(row.id);
    ElMessage.success('删除成功');
    loadDevices();
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

const handleDownloadTemplate = async () => {
  try {
    loading.value = true;
    await deviceService.downloadTemplate();
    ElMessage.success('模板下载成功');
  } catch (error: any) {
    console.error('下载模板错误:', error);
    const errorMessage = error?.message || error?.response?.data?.message || '未知错误';
    ElMessage.error(`下载失败: ${errorMessage}`);
  } finally {
    loading.value = false;
  }
};

const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.onchange = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      loading.value = true;
      const result = await deviceService.import(file);
      if (result.failed > 0) {
        // 显示详细的错误信息
        const errorDetails = result.errors
          .slice(0, 10) // 只显示前10个错误
          .map((err: any) => `第${err.row}行: ${err.error}`)
          .join('\n');
        console.error('导入错误详情:', result.errors);
        ElMessage.warning({
          message: `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条\n\n错误详情（前10条）：\n${errorDetails}`,
          duration: 8000,
          showClose: true,
        });
      } else {
        ElMessage.success(`导入成功: ${result.success} 条`);
      }
      loadDevices();
    } catch (error: any) {
      console.error('导入失败:', error);
      ElMessage.error(error.response?.data?.message || '导入失败: ' + error.message);
    } finally {
      loading.value = false;
    }
  };
  input.click();
};

const handleExport = async () => {
  try {
    loading.value = true;
    await deviceService.export();
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error('导出失败: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDevices();
  loadWorkshops();
});
</script>

<style scoped>
.devices-container {
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

