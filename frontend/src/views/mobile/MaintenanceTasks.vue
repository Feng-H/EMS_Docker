<template>
  <div class="mobile-page">
    <div class="page-header">
      <h2>保养任务</h2>
      <span class="sub-text">随时查看并执行待办保养</span>
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

    <div class="task-list" v-loading="loading">
      <template v-if="!loading && tasks.length === 0">
        <div class="empty">
          <p>当前无{{ statusLabel }}任务</p>
        </div>
      </template>

      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-card"
        @click="openTask(task.id)"
      >
        <div class="task-top">
          <div class="task-title">{{ task.plan?.title || '未命名计划' }}</div>
          <el-tag
            size="small"
            :type="getStatusTagType(task.status)"
          >
            {{ getStatusText(task.status) }}
          </el-tag>
        </div>

        <div class="task-info">
          <div class="info-row">
            <span class="label">设备</span>
            <span class="value">
              {{ task.device?.assetNo || '-' }}
              <span class="divider">|</span>
              {{ task.device?.name || '未登记设备' }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">计划时间</span>
            <span class="value">{{ formatDate(task.scheduledAt) }}</span>
          </div>
          <div class="info-row" v-if="task.plan?.frequencyType">
            <span class="label">周期</span>
            <span class="value">{{ getFrequencyText(task.plan) }}</span>
          </div>
        </div>

        <div class="task-actions">
          <el-button
            type="primary"
            plain
            size="large"
            @click.stop="startTask(task.id)"
          >
            {{ getActionText(task.status) }}
          </el-button>
          <el-button
            size="large"
            text
            @click.stop="openTask(task.id)"
          >
            查看详情
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { maintenanceService } from '@/services/maintenance';

interface StatusTab {
  label: string;
  value: string;
  count?: number;
}

const router = useRouter();

const loading = ref(false);
const tasks = ref<any[]>([]);
const counts = ref<Record<string, number>>({});
const taskStats = ref<any>({});
const currentStatus = ref('pending');

const statusTabs = computed<StatusTab[]>(() => [
  { label: '待执行', value: 'pending', count: counts.value.pending },
  { label: '进行中', value: 'in_progress', count: counts.value.in_progress },
  { label: '待验收', value: 'pending_acceptance', count: counts.value.pending_acceptance },
  { label: '已完成', value: 'completed', count: counts.value.completed },
  { label: '逾期', value: 'overdue', count: counts.value.overdue },
]);

const statusLabel = computed(() => {
  const tab = statusTabs.value.find((item) => item.value === currentStatus.value);
  return tab?.label || '';
});

const loadTasks = async () => {
  loading.value = true;
  try {
    const [taskResp, statsResp] = await Promise.all([
      maintenanceService.getTasks({
        page: 1,
        limit: 50,
        status: currentStatus.value,
      }),
      maintenanceService.getStatistics().catch((err) => {
        console.error('保养统计失败:', err);
        return {};
      }),
    ]);

    tasks.value = taskResp?.data || [];
    taskStats.value = statsResp || {};
    counts.value = {
      pending: taskStats.value.pendingTasks || 0,
      in_progress: taskStats.value.inProgressTasks || 0,
      pending_acceptance: taskStats.value.pendingAcceptanceTasks || 0,
      completed: taskStats.value.completedTasks || 0,
      overdue: taskStats.value.overdueTasks || 0,
    };
  } catch (error) {
    console.error('加载保养任务失败:', error);
    ElMessage.error('加载保养任务失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const changeStatus = (value: string) => {
  if (currentStatus.value === value) return;
  currentStatus.value = value;
  loadTasks();
};

const startTask = (id: number) => {
  router.push({ name: 'MobileMaintenanceTaskDetail', params: { id } });
};

const openTask = (id: number) => {
  router.push({ name: 'MobileMaintenanceTaskDetail', params: { id } });
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
    pending: '待执行',
    in_progress: '进行中',
    pending_acceptance: '待验收',
    completed: '已完成',
    overdue: '逾期',
    cancelled: '已取消',
  };
  return map[status] || status;
};

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    in_progress: 'primary',
    pending_acceptance: 'warning',
    completed: 'success',
    overdue: 'danger',
    cancelled: 'info',
  };
  return map[status] || 'info';
};

const getActionText = (status: string) => {
  if (status === 'pending') return '开始执行';
  if (status === 'in_progress') return '继续执行';
  if (status === 'pending_acceptance') return '验收确认';
  if (status === 'overdue') return '立即处理';
  return '查看详情';
};

const getFrequencyText = (plan: any) => {
  if (!plan) return '-';
  const map: Record<string, string> = {
    shift: '按班次',
    daily: '按日',
    weekly: '按周',
    monthly: '按月',
    yearly: '按年',
  };
  const label = map[plan.frequencyType] || plan.frequencyType;
  return plan.frequencyValue ? `${label} / ${plan.frequencyValue}` : label;
};

onMounted(() => {
  loadTasks();
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

.task-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(7, 17, 27, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s;
}

.task-card:active {
  transform: scale(0.99);
}

.task-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-info {
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

.task-actions {
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

  .task-card {
    padding: 14px;
  }

  .task-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .task-actions .el-button {
    width: 100%;
  }
}
</style>
