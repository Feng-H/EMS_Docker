<template>
  <div class="work-order-detail" v-if="order">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="工单号">{{ order.orderNo }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="getStatusType(order.status)">
          {{ getStatusText(order.status) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="标题">{{ order.title }}</el-descriptions-item>
      <el-descriptions-item label="优先级">
        <el-tag :type="getPriorityType(order.priority)">
          {{ getPriorityText(order.priority) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="设备" :span="2">
        <div v-if="order.device">
          <div style="font-weight: 500">{{ order.device.name }}</div>
          <div style="font-size: 12px; color: #909399; margin-top: 4px">编号：{{ order.device.assetNo }}</div>
        </div>
        <span v-else style="color: #909399">未关联设备</span>
      </el-descriptions-item>
      <el-descriptions-item label="报修人">{{ order.reporter?.name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="负责人">{{ order.assignee?.name || '未分配' }}</el-descriptions-item>
      <el-descriptions-item label="联系方式">{{ order.contact || '-' }}</el-descriptions-item>
      <el-descriptions-item label="故障分类">{{ order.faultCategory || '-' }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ order.created_at }}</el-descriptions-item>
      <el-descriptions-item label="故障描述" :span="2">
        <div style="white-space: pre-wrap">{{ order.description || '-' }}</div>
      </el-descriptions-item>
      <el-descriptions-item label="故障原因" :span="2" v-if="order.faultCause">
        <div style="white-space: pre-wrap">{{ order.faultCause }}</div>
      </el-descriptions-item>
      <el-descriptions-item label="解决方案" :span="2" v-if="order.solution">
        <div style="white-space: pre-wrap">{{ order.solution }}</div>
      </el-descriptions-item>
      <el-descriptions-item label="报修时间" v-if="order.reportedAt">
        {{ formatDateTime(order.reportedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="维修开始时间" v-if="order.startedAt">
        {{ formatDateTime(order.startedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="维修完成时间" v-if="order.finishedAt">
        {{ formatDateTime(order.finishedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="响应时间" v-if="order.responseTime !== undefined && order.responseTime !== null">
        {{ formatTime(order.responseTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="维修时间" v-if="order.repairTime !== undefined && order.repairTime !== null">
        {{ formatTime(order.repairTime) }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="attachment-section" v-if="attachmentImages.length">
      <h3>报修附件</h3>
      <div class="attachment-grid">
        <el-image
          v-for="(src, index) in attachmentImages"
          :key="index"
          :src="src"
          fit="cover"
          :preview-src-list="attachmentPreviewList"
          :initial-index="index"
        />
      </div>
    </div>

    <div class="action-buttons" style="margin-top: 20px">
      <template v-if="order.status === 'assigned'">
        <el-button type="success" @click="handleAccept">接受工单</el-button>
        <el-button type="warning" @click="handleStart">开始执行</el-button>
      </template>
      <template v-if="order.status === 'accepted'">
        <el-button type="warning" @click="handleStart">开始执行</el-button>
      </template>
      <template v-if="order.status === 'in_progress'">
        <el-button type="success" @click="handleComplete">完成维修</el-button>
      </template>
      <template v-if="order.status === 'pending_acceptance'">
        <el-button type="success" @click="handleAcceptance(true)">验收通过</el-button>
        <el-button type="danger" @click="handleAcceptance(false)">驳回</el-button>
      </template>
    </div>

    <!-- 维修执行表单 -->
    <el-card v-if="order.status === 'in_progress'" style="margin-top: 20px">
      <template #header>
        <span>维修执行</span>
      </template>
      <div v-if="attachmentImages.length" class="execute-attachments">
        <div class="section-subtitle">报修照片</div>
        <div class="attachment-grid execute">
          <el-image
            v-for="(src, index) in attachmentImages"
            :key="`execute-${index}`"
            :src="src"
            fit="cover"
            :preview-src-list="attachmentPreviewList"
            :initial-index="index"
          />
        </div>
      </div>
      <el-form :model="executeForm" :rules="executeRules" ref="executeFormRef" label-width="100px">
        <el-form-item label="故障原因" prop="faultCause">
          <el-input v-model="executeForm.faultCause" type="textarea" :rows="3" placeholder="请输入故障原因（必填）" />
        </el-form-item>
        <el-form-item label="解决方案" prop="solution">
          <el-input v-model="executeForm.solution" type="textarea" :rows="3" placeholder="请输入解决方案（必填）" />
        </el-form-item>
        <el-form-item label="备件领用">
          <!-- 显示已领用的备件（只读，不可修改数量和删除） -->
          <div v-if="usedParts.length > 0" style="margin-bottom: 15px; padding: 10px; background-color: #f5f7fa; border-radius: 4px; border: 1px solid #e4e7ed;">
            <div style="font-weight: 500; margin-bottom: 8px; color: #909399; display: flex; align-items: center; gap: 5px;">
              <el-icon style="font-size: 14px;"><Lock /></el-icon>
              <span>已领用备件（已使用，数量和内容不可修改）</span>
            </div>
            <div v-for="(usedPart, index) in usedParts" :key="`used-${index}`" style="margin-bottom: 8px; padding: 8px; background-color: white; border-radius: 4px; display: flex; align-items: center; gap: 10px; border: 1px solid #e4e7ed;">
              <span style="flex: 1; color: #606266;">{{ usedPart.part?.name || '未知备件' }} ({{ usedPart.part?.partNo || '' }})</span>
              <span style="min-width: 100px; text-align: right; color: #606266; font-weight: 500;">数量：{{ usedPart.qty }} {{ usedPart.part?.unit || '' }}</span>
            </div>
          </div>
          <!-- 新增备件领用 -->
          <div v-for="(item, index) in executeForm.spareParts" :key="index" style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center">
            <el-select v-model="item.partId" placeholder="选择备件" filterable style="flex: 1" @change="handlePartChange(index)">
              <el-option
                v-for="part in sparePartOptions"
                :key="part.id"
                :label="`${part.name} (${part.partNo}) - 库存: ${part.stockQty}${part.unit}`"
                :value="part.id"
                :disabled="part.stockQty <= 0"
              />
            </el-select>
            <el-input-number 
              v-model="item.qty" 
              :min="getMinQty(item.partId)" 
              :step="getStepQty(item.partId)" 
              :precision="getPrecisionQty(item.partId)" 
              placeholder="数量" 
              style="width: 120px" 
            />
            <span style="min-width: 40px">{{ getPartUnit(item.partId) }}</span>
            <el-button type="danger" link @click="removeSparePart(index)" v-if="executeForm.spareParts.length > 1">删除</el-button>
          </div>
          <el-button type="primary" link @click="addSparePart" style="margin-top: 10px">
            <el-icon><Plus /></el-icon>
            添加备件
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmitExecute" :loading="submitting">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Lock } from '@element-plus/icons-vue';
import { workOrderService, type WorkOrder } from '@/services/workOrders';
import { sparePartService, type SparePart } from '@/services/spareParts';

const props = defineProps<{
  order: WorkOrder;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const submitting = ref(false);
const executeFormRef = ref();

const executeForm = reactive({
  faultCause: props.order.faultCause || '',
  solution: props.order.solution || '',
  spareParts: [] as { partId: number | null; qty: number }[],
});

const sparePartOptions = ref<SparePart[]>([]);
const usedParts = ref<any[]>([]); // 已领用的备件列表
const attachmentImages = computed(() => {
  if (!props.order?.attachments || props.order.attachments.length === 0) {
    return [] as string[];
  }
  return props.order.attachments
    .filter((item) => item && item.trim().length > 0)
    .map((item) => {
      if (item.startsWith('data:')) {
        return item;
      }
      const [mime, data] = item.split(':');
      if (data) {
        return `data:${mime};base64,${data}`;
      }
      return item;
    });
});
const attachmentPreviewList = computed(() => attachmentImages.value);

const loadSpareParts = async () => {
  try {
    const response = await sparePartService.getList({ limit: 1000 });
    sparePartOptions.value = response.data;
  } catch (error: any) {
    ElMessage.error('加载备件列表失败: ' + (error.message || '未知错误'));
  }
};

const loadUsedParts = async () => {
  try {
    const parts = await workOrderService.getParts(props.order.id);
    usedParts.value = parts;
  } catch (error: any) {
    console.error('加载已领用备件失败:', error);
  }
};

const addSparePart = () => {
  executeForm.spareParts.push({ partId: null, qty: 1 });
};

const removeSparePart = (index: number) => {
  executeForm.spareParts.splice(index, 1);
};

const getPartUnit = (partId: number | null): string => {
  if (!partId) return '';
  const part = sparePartOptions.value.find(p => p.id === partId);
  return part?.unit || '';
};

// 根据单位类型获取最小数量
const getMinQty = (partId: number | null): number => {
  if (!partId) return 0.01;
  const part = sparePartOptions.value.find(p => p.id === partId);
  const unit = part?.unit || '';
  // pc 和 set 单位最小值为1（正整数）
  if (unit === 'pc' || unit === 'set') {
    return 1;
  }
  // m 单位可以输入小数
  return 0.01;
};

// 根据单位类型获取步长
const getStepQty = (partId: number | null): number => {
  if (!partId) return 0.01;
  const part = sparePartOptions.value.find(p => p.id === partId);
  const unit = part?.unit || '';
  // pc 和 set 单位步长为1（整数）
  if (unit === 'pc' || unit === 'set') {
    return 1;
  }
  // m 单位步长为0.01（小数）
  return 0.01;
};

// 根据单位类型获取精度
const getPrecisionQty = (partId: number | null): number => {
  if (!partId) return 2;
  const part = sparePartOptions.value.find(p => p.id === partId);
  const unit = part?.unit || '';
  // pc 和 set 单位精度为0（整数）
  if (unit === 'pc' || unit === 'set') {
    return 0;
  }
  // m 单位精度为2（小数）
  return 2;
};

const handlePartChange = (index: number) => {
  const item = executeForm.spareParts[index];
  if (item.partId) {
    const part = sparePartOptions.value.find(p => p.id === item.partId);
    if (part) {
      // 根据单位类型调整数量
      const unit = part.unit || '';
      if (unit === 'pc' || unit === 'set') {
        // pc 和 set 单位，如果当前数量是小数，则向上取整
        if (item.qty && item.qty % 1 !== 0) {
          item.qty = Math.ceil(item.qty);
        }
        // 确保最小值为1
        if (item.qty < 1) {
          item.qty = 1;
        }
      }
      
      // 检查库存
      if (item.qty > part.stockQty) {
        ElMessage.warning(`库存不足，当前库存：${part.stockQty}${part.unit}`);
        item.qty = part.stockQty;
        // 如果是 pc 或 set 单位，确保数量是整数
        if ((unit === 'pc' || unit === 'set') && item.qty % 1 !== 0) {
          item.qty = Math.floor(item.qty);
        }
      }
    }
  }
};

onMounted(() => {
  loadSpareParts();
  // 如果工单是执行中状态，加载已领用的备件
  if (props.order.status === 'in_progress') {
    loadUsedParts();
  }
  // 初始化一个空的备件项
  if (executeForm.spareParts.length === 0) {
    addSparePart();
  }
});

// 监听工单状态变化，重新加载已领用备件
watch(() => props.order.status, (newStatus) => {
  if (newStatus === 'in_progress') {
    loadUsedParts();
  }
});

const executeRules = {
  faultCause: [
    { required: true, message: '请输入故障原因', trigger: 'blur' },
  ],
  solution: [
    { required: true, message: '请输入解决方案', trigger: 'blur' },
  ],
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

const handleAccept = async () => {
  try {
    await workOrderService.update(props.order.id, { status: 'accepted' });
    ElMessage.success('已接受工单');
    emit('refresh');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

const handleStart = async () => {
  try {
    await workOrderService.update(props.order.id, { status: 'in_progress' });
    ElMessage.success('已开始执行');
    emit('refresh');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

const handleSubmitExecute = async () => {
  submitting.value = true;
  try {
    // 验证备件数量（pc 和 set 单位必须是整数）
    for (const item of executeForm.spareParts) {
      if (item.partId && item.qty > 0) {
        const part = sparePartOptions.value.find(p => p.id === item.partId);
        if (part) {
          const unit = part.unit || '';
          if ((unit === 'pc' || unit === 'set') && item.qty % 1 !== 0) {
            ElMessage.error(`备件 ${part.name} 的单位是 ${unit}，数量必须是整数`);
            submitting.value = false;
            return;
          }
        }
      }
    }

    // 先保存故障原因和解决方案
    await workOrderService.update(props.order.id, {
      faultCause: executeForm.faultCause,
      solution: executeForm.solution,
    });

    // 如果有备件领用，保存备件领用信息
    const validSpareParts = executeForm.spareParts.filter(item => item.partId && item.qty > 0);
    if (validSpareParts.length > 0) {
      await workOrderService.useSpareParts(props.order.id, validSpareParts.map(item => ({
        partId: item.partId!,
        qty: item.qty,
      })));
    }

    ElMessage.success('保存成功');
    emit('refresh');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
};

const handleComplete = async () => {
  // 验证表单
  if (!executeFormRef.value) return;
  
  await executeFormRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.warning('请先填写故障原因和解决方案');
      return;
    }

    // 验证故障原因和解决方案是否填写
    if (!executeForm.faultCause || !executeForm.faultCause.trim()) {
      ElMessage.warning('请先填写故障原因');
      return;
    }
    if (!executeForm.solution || !executeForm.solution.trim()) {
      ElMessage.warning('请先填写解决方案');
      return;
    }

    try {
      // 先保存故障原因和解决方案
      await workOrderService.update(props.order.id, {
        faultCause: executeForm.faultCause,
        solution: executeForm.solution,
      });
      // 然后更新状态为待验收
      await workOrderService.update(props.order.id, { status: 'pending_acceptance' });
      ElMessage.success('已完成，等待验收');
      emit('refresh');
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '操作失败');
    }
  });
};

const handleAcceptance = async (approved: boolean) => {
  try {
    if (approved) {
      // 验收通过
      await workOrderService.update(props.order.id, { status: 'completed' });
      ElMessage.success('验收通过');
    } else {
      // 驳回，回到执行中状态，清空故障原因和解决方案
      await workOrderService.update(props.order.id, { 
        status: 'in_progress',
        faultCause: '',
        solution: ''
      });
      ElMessage.success('已驳回，工单已回到执行中状态');
    }
    emit('refresh');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

// 格式化日期时间
const formatDateTime = (dateTime: string | Date) => {
  if (!dateTime) return '-';
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 格式化时间（分钟）
const formatTime = (minutes: number) => {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) {
    return `${minutes} 分钟`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    let result = `${days} 天`;
    if (hours > 0) result += ` ${hours} 小时`;
    if (mins > 0) result += ` ${mins} 分钟`;
    return result;
  }
};
</script>

<style scoped>
.work-order-detail {
  padding: 10px;
}

.attachment-section {
  margin-top: 20px;
}

.attachment-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.attachment-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.attachment-grid :deep(.el-image) {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  overflow: hidden;
  background: #f5f7fa;
}

.attachment-grid.execute :deep(.el-image) {
  width: 90px;
  height: 90px;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.execute-attachments {
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-buttons :deep(.el-button) {
  flex: 1;
  min-width: 140px;
}
</style>

