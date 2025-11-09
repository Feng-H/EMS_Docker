<template>
  <div class="mobile-page">
    <div class="page-header">
      <el-button text @click="goBack" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>维修工单详情</h2>
    </div>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else-if="order">
      <section class="section">
        <h3>工单信息</h3>
        <div class="info-item">
          <span class="label">工单编号</span>
          <span class="value">{{ order.orderNo || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">状态</span>
          <el-tag :type="getStatusTagType(order.status)">{{ getStatusText(order.status) }}</el-tag>
        </div>
        <div class="info-item">
          <span class="label">优先级</span>
          <span class="value">
            <el-tag :type="getPriorityType(order.priority)">{{ getPriorityText(order.priority) }}</el-tag>
          </span>
        </div>
        <div class="info-item">
          <span class="label">报修人</span>
          <span class="value">{{ order.reporter?.name || '-' }}</span>
        </div>
      </section>

      <section class="section">
        <h3>设备信息</h3>
        <div class="info-item">
          <span class="label">设备编号</span>
          <span class="value">{{ order.device?.assetNo || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">设备名称</span>
          <span class="value">{{ order.device?.name || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">位置/厂房</span>
          <span class="value">{{ order.device?.workshop?.name || order.device?.location || '-' }}</span>
        </div>
      </section>

      <section class="section">
        <h3>时间记录</h3>
        <div class="info-item">
          <span class="label">报修时间</span>
          <span class="value">{{ formatDateTime(order.reportedAt || order.createdAt) }}</span>
        </div>
        <div class="info-item">
          <span class="label">开始维修</span>
          <span class="value">{{ formatDateTime(order.startedAt) }}</span>
        </div>
        <div class="info-item">
          <span class="label">完成维修</span>
          <span class="value">{{ formatDateTime(order.finishedAt) }}</span>
        </div>
        <div class="info-item">
          <span class="label">响应时间</span>
          <span class="value">{{ order.responseTime ? `${order.responseTime} 分钟` : '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">维修耗时</span>
          <span class="value">{{ order.repairTime ? `${order.repairTime} 分钟` : '-' }}</span>
        </div>
      </section>

      <section class="section">
        <h3>故障描述</h3>
        <p class="text-block">{{ order.description || '未填写' }}</p>
      </section>

      <!-- 执行表单 -->
      <section v-if="canExecute" class="section">
        <h3>维修执行</h3>
        <el-form :model="executeForm" ref="executeFormRef">
          <el-form-item prop="faultCause">
            <el-input
              v-model="executeForm.faultCause"
              type="textarea"
              :rows="3"
              placeholder="填写故障原因（必填）"
            />
          </el-form-item>
          <el-form-item prop="solution">
            <el-input
              v-model="executeForm.solution"
              type="textarea"
              :rows="3"
              placeholder="填写解决方案（必填）"
            />
          </el-form-item>
          <div class="part-section">
            <div class="part-header">
              <h4>备件领用</h4>
              <el-button type="primary" link @click="addSparePart" :disabled="!canExecute">
                <el-icon><Plus /></el-icon>
                添加备件
              </el-button>
            </div>
            <p class="hint">pc / set 单位需录入整数，m 单位支持小数</p>

            <div v-if="usedParts.length" class="used-parts">
              <div class="used-title">
                <el-icon><Lock /></el-icon>
                <span>已领用备件（不可修改）</span>
              </div>
              <div v-for="(item, index) in usedParts" :key="`used-${index}`" class="used-row">
                <span class="used-name">{{ item.part?.name || '未知备件' }} ({{ item.part?.partNo || '' }})</span>
                <span class="used-qty">数量：{{ item.qty }} {{ item.part?.unit || '' }}</span>
              </div>
            </div>

            <div
              v-for="(item, index) in executeForm.spareParts"
              :key="index"
              class="spare-row"
            >
              <el-select
                v-model="item.partId"
                placeholder="选择备件"
                filterable
                style="flex: 1"
                @change="handlePartChange(index)"
              >
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
                :max="getMaxQty(item.partId)"
                :precision="getPrecisionQty(item.partId)"
                :step="getStepQty(item.partId)"
                placeholder="数量"
                style="width: 120px"
              />
              <span class="unit">{{ getPartUnit(item.partId) }}</span>
              <el-button
                type="danger"
                link
                v-if="executeForm.spareParts.length > 1"
                @click="removeSparePart(index)"
              >
                删除
              </el-button>
            </div>
          </div>

          <div class="execute-actions">
            <el-button type="primary" @click="saveExecution" :loading="saveLoading">保存执行信息</el-button>
            <el-button type="success" @click="completeExecution" :loading="saveLoading">
              完成维修
            </el-button>
          </div>
        </el-form>
      </section>

      <!-- 验收操作 -->
      <section v-if="canReview" class="section">
        <h3>维修验收</h3>
        <el-input
          type="textarea"
          v-model="reviewForm.notes"
          :autosize="{ minRows: 3, maxRows: 5 }"
          placeholder="填写验收意见（驳回可填写理由）"
        />
        <div class="review-actions">
          <el-button type="success" size="large" :loading="reviewLoading" @click="submitAcceptance(true)">
            验收通过
          </el-button>
          <el-button type="danger" size="large" :loading="reviewLoading" @click="submitAcceptance(false)">
            驳回返工
          </el-button>
        </div>
      </section>

      <section v-else class="section">
        <h3>故障处理</h3>
        <div class="info-item">
          <span class="label">故障原因</span>
          <span class="value text">{{ order.faultCause || '未填写' }}</span>
        </div>
        <div class="info-item">
          <span class="label">解决方案</span>
          <span class="value text">{{ order.solution || '未填写' }}</span>
        </div>
      </section>

      <section class="section" v-if="previewImageList.length">
        <h3>报修照片</h3>
        <div class="image-grid">
          <el-image
            v-for="(src, index) in previewImageList"
            :key="`report-${index}`"
            :src="src"
            fit="cover"
            :preview-src-list="previewImageList"
            :initial-index="index"
          />
        </div>
      </section>

      <div v-if="executeExtraImages.length" class="image-grid" style="margin-bottom: 12px">
        <el-image
          v-for="(src, index) in executeExtraImages"
          :key="`execute-${index}`"
          :src="src"
          fit="cover"
          :preview-src-list="executeExtraImages"
          :initial-index="index"
        />
      </div>

      <div class="bottom-actions" v-if="canAccept || canStart">
        <template v-if="canAccept">
          <el-button type="primary" size="large" :loading="actionLoading" @click="acceptOrder">接受工单</el-button>
        </template>
        <template v-else-if="canStart">
          <el-button type="primary" size="large" :loading="actionLoading" @click="startExecution">开始执行</el-button>
        </template>
      </div>
    </template>

    <div v-else class="empty">
      <p>未找到工单信息</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Plus, Lock } from '@element-plus/icons-vue';
import { workOrderService, type WorkOrder } from '@/services/workOrders';
import { sparePartService, type SparePart } from '@/services/spareParts';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const actionLoading = ref(false);
const saveLoading = ref(false);
const reviewLoading = ref(false);

const order = ref<WorkOrder & { device?: any }>();
const sparePartOptions = ref<SparePart[]>([]);
const usedParts = ref<any[]>([]);

const executeFormRef = ref();
const executeForm = reactive({
  faultCause: '',
  solution: '',
  spareParts: [] as { partId: number | null; qty: number }[],
});

const reviewForm = reactive({
  notes: '',
});

const loadOrder = async () => {
  const id = Number(route.params.id);
  if (!id) {
    ElMessage.error('工单 ID 有误');
    router.back();
    return;
  }
  loading.value = true;
  try {
    const data = await workOrderService.getById(id);
    order.value = data;
    resetExecuteForm();
    reviewForm.notes = '';
    await Promise.all([loadUsedParts(id), loadSpareParts()]);
  } catch (error) {
    console.error('加载工单详情失败:', error);
    ElMessage.error('加载工单详情失败');
  } finally {
    loading.value = false;
  }
};

const loadSpareParts = async () => {
  try {
    const response = await sparePartService.getList({ page: 1, limit: 200 });
    sparePartOptions.value = response.data || [];
  } catch (error) {
    console.error('加载备件列表失败:', error);
  }
};

const loadUsedParts = async (id: number) => {
  try {
    const parts = await workOrderService.getParts(id);
    usedParts.value = parts || [];
  } catch (error) {
    console.error('加载已领用备件失败:', error);
    usedParts.value = [];
  }
};

const resetExecuteForm = () => {
  executeForm.faultCause = order.value?.faultCause || '';
  executeForm.solution = order.value?.solution || '';
  executeForm.spareParts.splice(0, executeForm.spareParts.length, { partId: null, qty: 1 });
};

const addSparePart = () => {
  executeForm.spareParts.push({ partId: null, qty: 1 });
};

const removeSparePart = (index: number) => {
  executeForm.spareParts.splice(index, 1);
};

const handlePartChange = (index: number) => {
  const partId = executeForm.spareParts[index].partId;
  if (!partId) return;
  const part = sparePartOptions.value.find((p) => p.id === partId);
  if (part) {
    executeForm.spareParts[index].qty = getMinQty(partId);
  }
};

const getPartUnit = (partId: number | null) => {
  const part = sparePartOptions.value.find((p) => p.id === partId);
  return part?.unit || '';
};

const getMinQty = (partId: number | null) => {
  const part = sparePartOptions.value.find((p) => p.id === partId);
  if (!part) return 0.1;
  if (part.unit === 'pc' || part.unit === 'set') return 1;
  return 0.1;
};

const getMaxQty = (partId: number | null) => {
  const part = sparePartOptions.value.find((p) => p.id === partId);
  if (!part) return undefined;
  const stock = Number(part.stockQty);
  return Number.isNaN(stock) ? undefined : stock;
};

const getStepQty = (partId: number | null) => {
  const part = sparePartOptions.value.find((p) => p.id === partId);
  if (!part) return 1;
  return part.unit === 'pc' || part.unit === 'set' ? 1 : 0.1;
};

const getPrecisionQty = (partId: number | null) => {
  const part = sparePartOptions.value.find((p) => p.id === partId);
  if (!part) return 0;
  return part.unit === 'pc' || part.unit === 'set' ? 0 : 1;
};

const goBack = () => {
  router.back();
};

const acceptOrder = async () => {
  if (!order.value) return;
  actionLoading.value = true;
  try {
    await workOrderService.update(order.value.id, { status: 'accepted' });
    ElMessage.success('已接受工单');
    await loadOrder();
  } catch (error) {
    console.error('接受工单失败:', error);
    ElMessage.error('接受工单失败');
  } finally {
    actionLoading.value = false;
  }
};

const startExecution = async () => {
  if (!order.value) return;
  actionLoading.value = true;
  try {
    await workOrderService.update(order.value.id, { status: 'in_progress' });
    ElMessage.success('已开始执行');
    await loadOrder();
  } catch (error) {
    console.error('开始执行失败:', error);
    ElMessage.error('开始执行失败');
  } finally {
    actionLoading.value = false;
  }
};

const persistExecution = async () => {
  if (!order.value) return;
  await workOrderService.update(order.value.id, {
    faultCause: executeForm.faultCause,
    solution: executeForm.solution,
  });

  const partsToUse = executeForm.spareParts.filter((item) => item.partId && item.qty > 0);
  if (partsToUse.length > 0) {
    for (const item of partsToUse) {
      const part = sparePartOptions.value.find((p) => p.id === item.partId);
      if (!part) continue;
      const unit = part.unit || '';
      if ((unit === 'pc' || unit === 'set') && item.qty % 1 !== 0) {
        throw new Error(`备件 ${part.name} 的单位是 ${unit}，数量必须为整数`);
      }
    }
    await workOrderService.useSpareParts(order.value.id, partsToUse as { partId: number; qty: number }[]);
  }
};

const saveExecution = async () => {
  if (!order.value) return;
  saveLoading.value = true;
  try {
    await persistExecution();
    ElMessage.success('执行信息已保存');
    await loadOrder();
  } catch (error: any) {
    console.error('保存执行信息失败:', error);
    ElMessage.error(error?.response?.data?.message || error.message || '保存执行信息失败');
  } finally {
    saveLoading.value = false;
  }
};

const completeExecution = async () => {
  if (!order.value) return;
  if (!executeForm.faultCause.trim()) {
    ElMessage.warning('请填写故障原因');
    return;
  }
  if (!executeForm.solution.trim()) {
    ElMessage.warning('请填写解决方案');
    return;
  }
  saveLoading.value = true;
  try {
    await persistExecution();
    await workOrderService.update(order.value.id, { status: 'pending_acceptance' });
    ElMessage.success('已提交待验收');
    await loadOrder();
  } catch (error) {
    console.error('提交待验收失败:', error);
    ElMessage.error('提交待验收失败');
  } finally {
    saveLoading.value = false;
  }
};

const submitAcceptance = async (approved: boolean) => {
  if (!order.value) return;
  reviewLoading.value = true;
  try {
    if (approved) {
      await workOrderService.update(order.value.id, { status: 'completed' });
      ElMessage.success('验收通过');
    } else {
      await workOrderService.update(order.value.id, { status: 'in_progress', faultCause: '', solution: '' });
      ElMessage.success('已驳回，工单回到执行中');
    }
    await loadOrder();
  } catch (error) {
    console.error('提交验收结果失败:', error);
    ElMessage.error('提交验收结果失败');
  } finally {
    reviewLoading.value = false;
  }
};

const formatDateTime = (value?: string | Date) => {
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

const canAccept = computed(() => order.value && ['created', 'assigned'].includes(order.value.status));
const canStart = computed(() => order.value?.status === 'accepted');
const canExecute = computed(() => order.value?.status === 'in_progress');
const canReview = computed(() => order.value?.status === 'pending_acceptance');

watch(
  () => order.value?.status,
  () => {
    resetExecuteForm();
  }
);

const normalizeAttachments = (attachments?: string[]) => {
  if (!attachments || attachments.length === 0) return [] as string[];
  return attachments
    .filter((item) => item && item.trim().length > 0)
    .map((item) => {
      if (item.startsWith('data:')) return item;
      const [mime, data] = item.split(':');
      return data ? `data:${mime};base64,${data}` : item;
    });
};

const previewImageList = computed(() => normalizeAttachments(order.value?.attachments));
const executeExtraImages = computed(() => {
  const extra = (order.value as any)?.result?.attachments;
  return normalizeAttachments(extra);
});

onMounted(() => {
  loadOrder();
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

.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 6px 18px rgba(7, 17, 27, 0.08);
}

.section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #909399;
}

.value {
  color: #303133;
  text-align: right;
}

.value.text {
  text-align: left;
  white-space: pre-wrap;
}

.text-block {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  white-space: pre-wrap;
}

.part-section {
  background: #fafafa;
  border-radius: 10px;
  padding: 12px;
  border: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.part-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.used-parts {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.used-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
}

.used-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #606266;
}

.spare-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.unit {
  min-width: 40px;
  text-align: center;
  color: #606266;
}

.execute-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.review-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bottom-actions {
  position: sticky;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.empty,
.loading {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.image-grid :deep(.el-image) {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  overflow: hidden;
  background: #f5f7fa;
}

@media (max-width: 480px) {
  .mobile-page {
    padding: 12px;
  }

  .spare-row {
    flex-wrap: wrap;
  }

  .spare-row > * {
    flex: 1 1 100%;
  }

  .unit {
    align-self: flex-start;
  }
}
</style>
