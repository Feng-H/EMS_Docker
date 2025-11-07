<template>
  <div class="mobile-page">
    <div class="page-header">
      <h2>维修工单</h2>
      <span class="sub-text">实时掌握维修任务进度</span>
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
        <span v-if="tab.count !== undefined" class="badge">{{ tab.count }}</span>
      </button>
    </div>

    <div class="order-list" v-loading="loading">
      <template v-if="!loading && orders.length === 0">
        <div class="empty">
          <p>当前无{{ statusLabel }}工单</p>
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
            <span class="label">优先级</span>
            <span class="value">
              <el-tag size="small" :type="getPriorityType(order.priority)">{{ getPriorityText(order.priority) }}</el-tag>
            </span>
          </div>
          <div class="info-row">
            <span class="label">报修时间</span>
            <span class="value">{{ formatDate(order.reportedAt || order.createdAt) }}</span>
          </div>
        </div>

        <div class="order-actions">
          <el-button
            type="primary"
            plain
            size="large"
            @click.stop="handlePrimaryAction(order)"
          >
            {{ getActionText(order.status) }}
          </el-button>
          <el-button size="large" text @click.stop="openOrder(order.id)">查看详情</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { workOrderService, type WorkOrder } from '@/services/workOrders';

interface StatusTab {
  label: string;
  value: string;
  count?: number;
}

const router = useRouter();

const loading = ref(false);
const orders = ref<WorkOrder[]>([]);
const stats = ref<any>({});
const currentStatus = ref('created');

const statusTabs = computed<StatusTab[]>(() => [
  { label: '待接单', value: 'created', count: (stats.value.created || 0) + (stats.value.assigned || 0) },
  { label: '待执行', value: 'accepted', count: stats.value.accepted || 0 },
  { label: '执行中', value: 'in_progress', count: stats.value.inProgress || 0 },
  { label: '待验收', value: 'pending_acceptance', count: stats.value.pendingAcceptance || 0 },
  { label: '已完成', value: 'completed', count: stats.value.completed || 0 },
]);

const statusLabel = computed(() => {
  const tab = statusTabs.value.find((item) => item.value === currentStatus.value);
  return tab?.label || '';
});

const loadOrders = async () => {
  loading.value = true;
  try {
    const statuses = currentStatus.value === 'created' ? ['created', 'assigned'] : [currentStatus.value];
    const listRes = await Promise.all(
      statuses.map((status) =>
        workOrderService.getList({ page: 1, limit: 50, status })
      )
    );
    const merged: WorkOrder[] = [];
    listRes.forEach((resp) => {
      if (resp?.data) {
        merged.push(...resp.data);
      }
    });
    // 去重并按创建时间排序
    orders.value = Array.from(new Map(merged.map((item) => [item.id, item])).values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.reportedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.reportedAt || 0).getTime();
      return timeB - timeA;
    });

    stats.value = await workOrderService.getStatistics().catch((err) => {
      console.error('维修统计失败:', err);
      return {};
    });
  } catch (error) {
    console.error('加载维修工单失败:', error);
    ElMessage.error('加载维修工单失败，请稍后重试');
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

const handlePrimaryAction = (order: WorkOrder) => {
  openOrder(order.id);
};

const formatDate = (value?: string | Date) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes()
    .toString()
    .padStart(2, '0')}`;
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

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急',
  };
  return map[priority] || priority;
};

const getPriorityType = (priority: string) => {
  const map: Record<string, string> = {
    low: 'info',
    normal: '',
    high: 'warning',
    urgent: 'danger',
  };
  return map[priority] || '';
};

const getActionText = (status: string) => {
  if (status === 'created' || status === 'assigned') return '接受工单';
  if (status === 'accepted') return '开始执行';
  if (status === 'in_progress') return '继续执行';
  if (status === 'pending_acceptance') return '验收确认';
  return '查看详情';
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
  margin-bottom: 12px;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.sub-text {
  display: block;
  margin-top: 4px;
  font-size: 14px;
  color: #909399;
}

.status-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
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

.status-tab .badge {
  display: inline-flex;
  min-width: 20px;
  padding: 0 6px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 12px;
  align-items: center;
  justify-content: center;
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

.order-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
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

  .order-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .order-actions .el-button {
    width: 100%;
  }
}
</style>
