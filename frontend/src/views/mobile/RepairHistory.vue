<template>
  <div class="mobile-page">
    <div class="page-header">
      <el-button text @click="goBack" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>维修记录</h2>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索设备/工单"
        clearable
        @clear="loadOrders"
        @keyup.enter.native="loadOrders"
      >
        <template #append>
          <el-button @click="loadOrders">搜索</el-button>
        </template>
      </el-input>
    </div>

    <div class="status-tabs">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        type="button"
        class="status-tab"
        :class="{ active: currentStatus === tab.value }"
        @click="changeStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="order-list" v-loading="loading">
      <template v-if="!loading && orders.length === 0">
        <div class="empty">
          <p>暂无相关维修记录</p>
        </div>
      </template>

      <div
        v-for="order in orders"
        :key="order.id"
        class="order-card"
        @click="openOrder(order.id)"
      >
        <div class="order-top">
          <div class="order-title">{{ order.title || '未命名工单' }}</div>
          <el-tag size="small" :type="getStatusTagType(order.status)">{{ getStatusText(order.status) }}</el-tag>
        </div>

        <div class="order-info">
          <div class="info-row">
            <span class="label">设备</span>
            <span class="value">
              {{ order.device?.assetNo || '-' }}
              <span class="divider">|</span>
              {{ order.device?.name || '未登记设备' }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">完成时间</span>
            <span class="value">{{ formatDate(order.finishedAt || order.updatedAt) }}</span>
          </div>
          <div class="info-row">
            <span class="label">维修耗时</span>
            <span class="value">{{ order.repairTime ? `${order.repairTime} 分钟` : '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { workOrderService, type WorkOrder } from '@/services/workOrders';

interface StatusTab {
  label: string;
  value: string;
}

const router = useRouter();

const loading = ref(false);
const orders = ref<WorkOrder[]>([]);
const searchText = ref('');
const currentStatus = ref('all');

const statusTabs = computed<StatusTab[]>(() => [
  { label: '全部', value: 'all' },
  { label: '待验收', value: 'pending_acceptance' },
  { label: '已完成', value: 'completed' },
  { label: '已关闭', value: 'closed' },
]);

const loadOrders = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: 1,
      limit: 50,
    };
    if (currentStatus.value !== 'all') {
      params.status = currentStatus.value;
    }
    if (searchText.value.trim()) {
      params.search = searchText.value.trim();
    }
    const response = await workOrderService.getList(params);
    orders.value = response.data || [];
  } catch (error) {
    console.error('加载维修记录失败:', error);
    ElMessage.error('加载维修记录失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const changeStatus = (value: string) => {
  if (currentStatus.value === value) return;
  currentStatus.value = value;
  loadOrders();
};

const openOrder = (id: number) => {
  router.push({ name: 'MobileWorkOrderDetail', params: { id } });
};

const goBack = () => {
  router.back();
};

const formatDate = (value?: string | Date) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    created: '待接单',
    assigned: '待分配',
    accepted: '待执行',
    in_progress: '执行中',
    pending_acceptance: '待验收',
    completed: '已完成',
    closed: '已关闭',
  };
  return map[status] || status;
};

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    created: 'warning',
    assigned: 'warning',
    accepted: 'warning',
    in_progress: 'primary',
    pending_acceptance: 'danger',
    completed: 'success',
    closed: 'info',
  };
  return map[status] || 'info';
};

onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.mobile-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 16px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
}

.search-bar {
  margin-bottom: 12px;
}

.status-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.status-tab {
  flex-shrink: 0;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid #dcdfe6;
  background: #fff;
  font-size: 14px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.status-tab.active {
  border-color: #409eff;
  background: #409eff;
  color: #fff;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(7, 17, 27, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s;
}

.order-card:active {
  transform: scale(0.99);
}

.order-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.order-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.info-row .label {
  color: #909399;
}

.info-row .value {
  flex: 1;
  text-align: right;
  color: #303133;
}

.divider {
  margin: 0 4px;
  color: #dcdfe6;
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: #909399;
}

@media (max-width: 480px) {
  .mobile-page {
    padding: 12px;
  }

  .order-card {
    padding: 14px;
  }
}
</style>
