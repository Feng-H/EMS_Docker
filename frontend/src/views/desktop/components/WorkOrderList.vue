<template>
  <div class="work-order-list">
    <div class="filter-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索设备编号、设备名称或工单标题"
        style="width: 300px"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="localPriority" placeholder="优先级" style="width: 150px" clearable @change="handleFilterChange">
        <el-option label="低" value="low" />
        <el-option label="普通" value="normal" />
        <el-option label="高" value="high" />
        <el-option label="紧急" value="urgent" />
      </el-select>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="loadOrders">刷新</el-button>
    </div>

    <el-table :data="orderList" v-loading="loading" style="width: 100%; margin-top: 20px">
      <el-table-column prop="orderNo" label="工单号" width="150" />
      <el-table-column prop="title" label="标题" width="200" />
      <el-table-column prop="device.assetNo" label="设备编号" width="150">
        <template #default="{ row }">
          <span v-if="row.device">{{ row.device.assetNo }}</span>
          <span v-else style="color: #909399">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="device.name" label="设备名称" width="150">
        <template #default="{ row }">
          <span v-if="row.device">{{ row.device.name }}</span>
          <span v-else style="color: #909399">未关联设备</span>
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="100">
        <template #default="{ row }">
          <el-tag :type="getPriorityType(row.priority)">
            {{ getPriorityText(row.priority) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="assignee.name" label="负责人" width="120" />
      <el-table-column prop="created_at" label="创建时间" width="150" />
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="$emit('view', row)">查看</el-button>
          <template v-if="row.status === 'created'">
            <el-button type="primary" link size="small" @click="$emit('edit', row)">编辑/分配</el-button>
            <el-button type="warning" link size="small" @click="$emit('start', row)">直接开始</el-button>
            <el-button type="danger" link size="small" @click="$emit('delete', row)">删除</el-button>
          </template>
          <template v-if="row.status === 'assigned'">
            <el-button type="success" link size="small" @click="$emit('accept', row)">接受</el-button>
            <el-button type="warning" link size="small" @click="$emit('start', row)">开始</el-button>
          </template>
          <template v-if="row.status === 'accepted'">
            <el-button type="warning" link size="small" @click="$emit('start', row)">开始执行</el-button>
          </template>
          <template v-if="row.status === 'in_progress'">
            <el-button type="success" link size="small" @click="$emit('complete', row)">完成</el-button>
          </template>
          <template v-if="row.status === 'pending_acceptance'">
            <el-button type="success" link size="small" @click="$emit('acceptance', row, true)">验收通过</el-button>
            <el-button type="danger" link size="small" @click="$emit('acceptance', row, false)">驳回</el-button>
          </template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { workOrderService, type WorkOrder } from '@/services/workOrders';

const props = defineProps<{
  statusFilter?: string;
  priorityFilter?: string;
}>();

const emit = defineEmits<{
  edit: [order: WorkOrder];
  view: [order: WorkOrder];
  delete: [order: WorkOrder];
  assign: [order: WorkOrder];
  accept: [order: WorkOrder];
  start: [order: WorkOrder];
  complete: [order: WorkOrder];
  acceptance: [order: WorkOrder, approved: boolean];
}>();

const loading = ref(false);
const orderList = ref<WorkOrder[]>([]);
const localPriority = ref(props.priorityFilter || '');
const searchText = ref('');

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

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

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    created: '待报修',
    assigned: '待执行',
    accepted: '已接受',
    in_progress: '执行中',
    pending_acceptance: '待验收',
    completed: '已完成',
    closed: '已关闭',
  };
  return map[status] || status;
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    created: 'info',
    assigned: 'warning',
    accepted: 'warning',
    in_progress: 'warning',
    pending_acceptance: 'warning',
    completed: 'success',
    closed: 'info',
  };
  return map[status] || '';
};

const loadOrders = async () => {
  loading.value = true;
  try {
    const response = await workOrderService.getList({
      page: pagination.page,
      limit: pagination.limit,
      status: props.statusFilter,
      priority: localPriority.value || undefined,
      search: searchText.value || undefined,
    });
    orderList.value = response.data;
    pagination.total = response.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadOrders();
};

const handleFilterChange = () => {
  pagination.page = 1;
  loadOrders();
};

const handlePageChange = () => {
  loadOrders();
};

const handleSizeChange = () => {
  pagination.page = 1;
  loadOrders();
};

const handleRefresh = () => {
  loadOrders();
};

onMounted(() => {
  loadOrders();
  window.addEventListener('refresh-work-orders', handleRefresh);
});

onUnmounted(() => {
  window.removeEventListener('refresh-work-orders', handleRefresh);
});
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
</style>

