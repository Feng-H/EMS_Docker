<template>
  <div class="users-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>人员管理</span>
          <div>
            <el-button @click="handleDownloadTemplate">
              <el-icon><Download /></el-icon>
              下载模板
            </el-button>
            <el-button @click="handleImport">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增人员
            </el-button>
          </div>
        </div>
      </template>

      <div class="filter-bar">
        <el-input
          v-model="searchText"
          placeholder="搜索姓名、用户名或工号"
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

      <el-table :data="userList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="employeeNo" label="工号" width="120" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="role.name" label="角色" width="120" />
        <el-table-column prop="department.name" label="部门" width="150" />
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleChangePassword(row)">修改密码</el-button>
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
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="工号" prop="employeeNo">
          <el-input v-model="formData.employeeNo" placeholder="请输入工号" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!currentEditId">
          <el-input v-model="formData.password" type="password" placeholder="默认密码：123456" />
          <div style="font-size: 12px; color: #909399; margin-top: 5px">不填写则使用默认密码：123456</div>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="formData.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="formData.roleId" placeholder="请选择角色" filterable style="width: 100%">
            <el-option
              v-for="role in roleOptions"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.isActive">
            <el-radio :label="true">启用</el-radio>
            <el-radio :label="false">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="400px"
      @close="handlePasswordDialogClose"
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPassword" :loading="passwordSubmitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="批量导入"
      width="600px"
      @close="handleImportDialogClose"
    >
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :on-change="handleFileChange"
        :file-list="fileList"
        accept=".xlsx,.xls"
        drag
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只能上传 xlsx/xls 文件，请先下载模板
          </div>
        </template>
      </el-upload>
      <div v-if="importResult" style="margin-top: 20px">
        <el-alert
          :title="`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
          :type="importResult.failed > 0 ? 'warning' : 'success'"
          :closable="false"
        />
        <div v-if="importResult.errors && importResult.errors.length > 0" style="margin-top: 10px; max-height: 200px; overflow-y: auto">
          <div v-for="(error, index) in importResult.errors" :key="index" style="font-size: 12px; color: #f56c6c; margin-top: 5px">
            第{{ error.row }}行：{{ error.error }}
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleSubmitImport" :loading="importing">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Download, Upload, UploadFilled } from '@element-plus/icons-vue';
import { userService, type User, type CreateUserDto, type UpdateUserDto, type ChangePasswordDto } from '@/services/users';
import type { UploadFile, UploadFiles } from 'element-plus';

const loading = ref(false);
const userList = ref<User[]>([]);
const searchText = ref('');
const dialogVisible = ref(false);
const dialogTitle = ref('新增人员');
const submitting = ref(false);
const formRef = ref();
const roleOptions = ref<any[]>([]);
const currentEditId = ref<number | null>(null);

// 密码修改相关
const passwordDialogVisible = ref(false);
const passwordFormRef = ref();
const passwordSubmitting = ref(false);
const currentPasswordUserId = ref<number | null>(null);
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// 批量导入相关
const importDialogVisible = ref(false);
const uploadRef = ref();
const fileList = ref<UploadFile[]>([]);
const importing = ref(false);
const importResult = ref<{ success: number; failed: number; errors: any[] } | null>(null);

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const formData = reactive<CreateUserDto & { isActive?: boolean }>({
  username: '',
  name: '',
  employeeNo: '',
  password: '',
  phone: '',
  email: '',
  roleId: undefined,
  isActive: true,
});

const loadUsers = async () => {
  loading.value = true;
  try {
    const response = await userService.getList({
      page: pagination.page,
      limit: pagination.limit,
      search: searchText.value || undefined,
    });
    userList.value = response.data;
    pagination.total = response.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadUsers();
};

const handlePageChange = () => {
  loadUsers();
};

const handleSizeChange = () => {
  pagination.page = 1;
  loadUsers();
};

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  employeeNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
};

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

const loadRoles = async () => {
  try {
    const roles = await userService.getRoles();
    roleOptions.value = roles;
  } catch (error: any) {
    console.error('加载角色列表失败:', error);
  }
};

const handleAdd = () => {
  dialogTitle.value = '新增人员';
  currentEditId.value = null;
  Object.assign(formData, {
    username: '',
    name: '',
    employeeNo: '',
    password: '',
    phone: '',
    email: '',
    roleId: undefined,
    isActive: true,
  });
  dialogVisible.value = true;
};

const handleEdit = async (row: User) => {
  dialogTitle.value = '编辑人员';
  currentEditId.value = row.id;
  try {
    const detail = await userService.getById(row.id);
    Object.assign(formData, {
      username: detail.username,
      name: detail.name,
      employeeNo: detail.employeeNo,
      password: '', // 编辑时不显示密码
      phone: detail.phone || '',
      email: detail.email || '',
      roleId: detail.roleId,
      isActive: detail.isActive,
    });
    dialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载用户详情失败');
  }
};

const handleDelete = async (row: User) => {
  try {
    await ElMessageBox.confirm('确定要删除该人员吗？', '提示', {
      type: 'warning',
    });
    await userService.delete(row.id);
    ElMessage.success('删除成功');
    loadUsers();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
};

const handleDialogClose = () => {
  formRef.value?.resetFields();
  currentEditId.value = null;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true;
      try {
        if (currentEditId.value) {
          // 编辑
          const updateData: UpdateUserDto = {
            username: formData.username,
            name: formData.name,
            employeeNo: formData.employeeNo,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            roleId: formData.roleId,
            isActive: formData.isActive,
          };
          await userService.update(currentEditId.value, updateData);
          ElMessage.success('更新成功');
        } else {
          // 新增
          const createData: CreateUserDto = {
            username: formData.username,
            name: formData.name,
            employeeNo: formData.employeeNo,
            password: formData.password || undefined, // 不填则使用默认123456
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            roleId: formData.roleId,
            isActive: formData.isActive,
          };
          await userService.create(createData);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadUsers();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleChangePassword = (row: User) => {
  currentPasswordUserId.value = row.id;
  Object.assign(passwordForm, {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  passwordDialogVisible.value = true;
};

const handlePasswordDialogClose = () => {
  passwordFormRef.value?.resetFields();
  currentPasswordUserId.value = null;
};

const handleSubmitPassword = async () => {
  if (!passwordFormRef.value || !currentPasswordUserId.value) return;
  
  await passwordFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      passwordSubmitting.value = true;
      try {
        const changePasswordDto: ChangePasswordDto = {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        };
        await userService.changePassword(currentPasswordUserId.value, changePasswordDto);
        ElMessage.success('密码修改成功');
        passwordDialogVisible.value = false;
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '密码修改失败');
      } finally {
        passwordSubmitting.value = false;
      }
    }
  });
};

const handleDownloadTemplate = async () => {
  try {
    await userService.downloadTemplate();
    ElMessage.success('模板下载成功');
  } catch (error: any) {
    ElMessage.error(error.message || '模板下载失败');
  }
};

const handleImport = () => {
  importDialogVisible.value = true;
  importResult.value = null;
  fileList.value = [];
};

const handleFileChange = (file: UploadFile, files: UploadFiles) => {
  fileList.value = files;
};

const handleImportDialogClose = () => {
  fileList.value = [];
  importResult.value = null;
  uploadRef.value?.clearFiles();
};

const handleSubmitImport = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择要导入的文件');
    return;
  }

  const file = fileList.value[0].raw;
  if (!file) {
    ElMessage.warning('文件无效');
    return;
  }

  importing.value = true;
  importResult.value = null;
  try {
    const result = await userService.import(file);
    importResult.value = result;
    if (result.failed === 0) {
      ElMessage.success(`导入成功，共导入 ${result.success} 条记录`);
      loadUsers();
    } else {
      ElMessage.warning(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`);
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '导入失败');
  } finally {
    importing.value = false;
  }
};

onMounted(() => {
  loadUsers();
  loadRoles();
});
</script>

<style scoped>
.users-container {
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
