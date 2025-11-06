<template>
  <el-container class="desktop-layout">
    <el-header>
      <div class="header-content">
        <h1>设备管理系统</h1>
        <div class="user-info">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-icon style="margin-right: 5px;"><User /></el-icon>
              {{ authStore.user?.name }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">
                  <el-icon><Lock /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>
    <el-container>
      <el-aside width="200px">
        <el-menu :default-active="activeMenu" router>
          <el-menu-item index="/desktop">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/desktop/devices">
            <el-icon><Setting /></el-icon>
            <span>设备台账</span>
          </el-menu-item>
          <el-menu-item index="/desktop/maintenance">
            <el-icon><Tools /></el-icon>
            <span>保养管理</span>
          </el-menu-item>
          <el-menu-item index="/desktop/work-orders">
            <el-icon><Document /></el-icon>
            <span>维修管理</span>
          </el-menu-item>
          <el-menu-item index="/desktop/spare-parts">
            <el-icon><Box /></el-icon>
            <span>备件管理</span>
          </el-menu-item>
          <el-menu-item v-if="canAccessUsers" index="/desktop/users">
            <el-icon><User /></el-icon>
            <span>人员管理</span>
          </el-menu-item>
          <el-menu-item index="/desktop/workshops">
            <el-icon><OfficeBuilding /></el-icon>
            <span>厂房管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="500px"
      @close="handleClosePasswordDialog"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入原密码"
            show-password
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            autocomplete="off"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPassword">确定</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox, ElMessage, ElDialog, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus';
import { useAuthStore } from '@/store/auth';
import { userService, type ChangePasswordDto } from '@/services/users';
import { HomeFilled, Setting, Tools, Document, Box, User, OfficeBuilding, ArrowDown, SwitchButton, Lock } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const activeMenu = computed(() => route.path);

// 权限控制：只有工程师和管理员可以访问人员管理
const canAccessUsers = computed(() => {
  const role = authStore.user?.role?.name || authStore.user?.role;
  return role === '工程师' || role === 'admin';
});

const passwordDialogVisible = ref(false);
const passwordFormRef = ref();
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
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

const handleCommand = (command: string) => {
  if (command === 'changePassword') {
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    passwordDialogVisible.value = true;
  } else if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        authStore.logout();
      })
      .catch(() => {
        // 用户取消，不做任何操作
      });
  }
};

const handleSubmitPassword = async () => {
  if (!passwordFormRef.value) return;
  
  await passwordFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const changePasswordDto: ChangePasswordDto = {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        };
        
        const userId = authStore.user?.id;
        if (!userId) {
          ElMessage.error('无法获取用户信息，请重新登录');
          return;
        }
        
        await userService.changePassword(userId, changePasswordDto);
        ElMessage.success('密码修改成功，请重新登录');
        passwordDialogVisible.value = false;
        
        // 延迟退出登录，让用户看到成功提示
        setTimeout(() => {
          authStore.logout();
        }, 1500);
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '密码修改失败');
      }
    }
  });
};

const handleClosePasswordDialog = () => {
  passwordForm.oldPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordFormRef.value?.resetFields();
};
</script>

<style scoped>
.desktop-layout {
  height: 100vh;
}

.el-header {
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: white;
  font-size: 14px;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-dropdown:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.el-aside {
  background: #f5f5f5;
}

.el-main {
  background: #fff;
}
</style>
