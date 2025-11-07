.nav-line {
  display: block;
  line-height: 1.1;
}
<template>
  <div class="mobile-layout">
    <div class="header">
      <div class="header-top">
        <h2>设备管理系统</h2>
        <el-button size="small" type="danger" plain @click="handleLogout">退出</el-button>
      </div>
      <div class="nav-tabs">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="nav-btn"
          :class="{ active: isActive(item) }"
          @click="navigate(item.path)"
        >
          <span class="nav-line">{{ item.label.slice(0, 2) }}</span>
          <span class="nav-line">{{ item.label.slice(2) }}</span>
        </button>
      </div>
    </div>
    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

interface NavItem {
  label: string;
  path: string;
  isActive?: (routePath: string) => boolean;
}

const navItems: NavItem[] = [
  {
    label: '保养任务',
    path: '/mobile/maintenance/tasks',
    isActive: (path) => path.startsWith('/mobile/maintenance'),
  },
  {
    label: '维修工单',
    path: '/mobile/work-orders',
    isActive: (path) => path === '/mobile/work-orders' || /^\/mobile\/work-orders\/\d+/.test(path),
  },
  {
    label: '设备报修',
    path: '/mobile/work-orders/report',
    isActive: (path) => path.startsWith('/mobile/work-orders/report'),
  },
  {
    label: '维修记录',
    path: '/mobile/work-orders/history',
    isActive: (path) => path.startsWith('/mobile/work-orders/history'),
  },
];

const currentPath = computed(() => route.path);

const navigate = (path: string) => {
  if (currentPath.value !== path) {
    router.push(path);
  }
};

const isActive = (item: NavItem) => {
  if (item.isActive) {
    return item.isActive(currentPath.value);
  }
  return currentPath.value.startsWith(item.path);
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.mobile-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #409eff;
  color: white;
  padding: 15px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.header-top {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content {
  flex: 1;
  overflow-y: auto;
}


.nav-tabs {
  display: flex;
  gap: 12px;
  width: 100%;
}

.nav-btn {
  flex: 1;
  border: none;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  letter-spacing: 1px;
}

.nav-btn span {
  display: block;
  line-height: 1;
}

.nav-btn.active {
  background: white;
  color: #409eff;
  font-weight: 600;
}
</style>
