<template>
  <div class="mobile-page">
    <div class="page-header">
      <el-button text @click="goBack" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>保养任务详情</h2>
    </div>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else-if="task">
      <section class="section">
        <h3>任务信息</h3>
        <div class="info-item">
          <span class="label">任务状态</span>
          <el-tag :type="getStatusTagType(task.status)">{{ getStatusText(task.status) }}</el-tag>
        </div>
        <div class="info-item">
          <span class="label">计划名称</span>
          <span class="value">{{ task.plan?.title || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">计划时间</span>
          <span class="value">{{ formatDate(task.scheduledAt) }}</span>
        </div>
      </section>

      <section class="section">
        <h3>设备信息</h3>
        <div class="info-item">
          <span class="label">设备编号</span>
          <span class="value">{{ task.device?.assetNo || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">设备名称</span>
          <span class="value">{{ task.device?.name || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">位置/厂房</span>
          <span class="value">{{ task.device?.workshop?.name || task.device?.location || '-' }}</span>
        </div>
      </section>

      <section class="section">
        <h3>保养项目</h3>
        <div v-if="!task.plan?.items || task.plan.items.length === 0" class="empty">
          <p>该保养计划暂无保养项目</p>
        </div>
        <div
          v-for="item in task.plan?.items || []"
          :key="item.id"
          class="item-card"
        >
          <div class="item-header">
            <div class="item-name">{{ item.name }}</div>
            <el-tag size="small" :type="item.itemType === 'quantitative' ? 'success' : 'warning'">
              {{ item.itemType === 'quantitative' ? '定量' : '定性' }}
            </el-tag>
          </div>

          <div v-if="item.itemType === 'qualitative'" class="qualitative-options">
            <el-button
              v-for="option in qualitativeOptions(item)"
              :key="option.value"
              :type="formResults[item.id]?.value === option.value ? 'primary' : 'default'"
              size="large"
              class="qualitative-btn"
              @click="selectQualitative(item, option.value)"
              :disabled="!canEdit"
            >
              {{ option.label }}
            </el-button>
          </div>

          <div v-else class="quantitative-input">
            <div class="input-row">
              <el-input-number
                v-model="formResults[item.id].value"
                :min="item.quantitativeSettings?.minValue ?? undefined"
                :max="item.quantitativeSettings?.maxValue ?? undefined"
                :precision="2"
                :step="0.1"
                :disabled="!canEdit"
                controls-position="right"
                @change="handleQuantitativeChange(item)"
              />
              <span class="unit">{{ item.quantitativeSettings?.unit || '' }}</span>
            </div>
            <div class="range" v-if="item.quantitativeSettings">
              范围：
              <span>
                {{ item.quantitativeSettings.minValue ?? '-' }} ~ {{ item.quantitativeSettings.maxValue ?? '-' }}
              </span>
              {{ item.quantitativeSettings.unit || '' }}
            </div>
            <div class="status-badge" :class="formResults[item.id].status">
              {{ formResults[item.id].status === 'normal' ? '正常' : '异常' }}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <h3>备注信息</h3>
        <el-input
          type="textarea"
          v-model="extra.notes"
          :autosize="{ minRows: 3, maxRows: 5 }"
          placeholder="填写保养过程记录、发现的问题等"
          :disabled="!canEdit"
        />
      </section>

      <section v-if="canReview" class="section review-section">
        <h3>验收意见</h3>
        <p class="hint">请确认保养结果，若需返工请注明原因</p>
        <el-input
          type="textarea"
          v-model="reviewForm.notes"
          :autosize="{ minRows: 3, maxRows: 5 }"
          placeholder="填写验收意见（驳回必填）"
        />
      </section>

      <section v-if="task.hasAbnormal" class="section warning">
        <h3>异常提醒</h3>
        <p>该任务存在异常项，已自动生成维修工单。</p>
        <p v-if="task.abnormalWorkOrderId">关联工单：#{{ task.abnormalWorkOrderId }}</p>
      </section>

      <div class="bottom-actions" v-if="canEdit || canReview">
        <template v-if="canEdit">
          <el-button
            type="primary"
            size="large"
            :disabled="!canEdit || submitting || !isFormCompleted"
            :loading="submitting"
            @click="submitExecution"
          >
            提交执行结果
          </el-button>
        </template>
        <template v-else>
          <el-button
            type="success"
            size="large"
            :loading="reviewSubmitting"
            @click="submitReview(true)"
          >
            验收通过
          </el-button>
          <el-button
            type="danger"
            size="large"
            :loading="reviewSubmitting"
            @click="submitReview(false)"
          >
            驳回返工
          </el-button>
        </template>
      </div>
    </template>

    <div v-else class="empty">
      <p>未找到任务信息</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { maintenanceService, type MaintenanceTask } from '@/services/maintenance';
import { ArrowLeft } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const task = ref<MaintenanceTask & { plan?: any }>();
const formResults = ref<Record<number, { type: 'qualitative' | 'quantitative'; value: any; status: 'normal' | 'abnormal' }>>({});
const extra = ref({ notes: '' });
const reviewForm = ref({ pass: true, notes: '' });
const submitting = ref(false);
const reviewSubmitting = ref(false);

const loadTask = async () => {
  const id = Number(route.params.id);
  if (!id) {
    ElMessage.error('任务 ID 有误');
    router.back();
    return;
  }
  loading.value = true;
  try {
    const result = await maintenanceService.getTaskById(id);
    if (result) {
      task.value = result as any;
      initialiseForm();
      initialiseReviewForm();
    } else {
      ElMessage.error('未查询到任务信息');
    }
  } catch (error) {
    console.error('获取任务详情失败:', error);
    ElMessage.error('获取任务详情失败');
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.back();
};

const initialiseForm = () => {
  if (!task.value?.plan?.items) return;
  const initial: typeof formResults.value = {};
  task.value.plan.items.forEach((item: any) => {
    const existing = task.value?.result?.[item.id] ?? task.value?.result?.[item.id.toString()];
    if (existing) {
      initial[item.id] = {
        type: existing.type,
        value: existing.value,
        status: existing.status,
      };
    } else if (item.itemType === 'qualitative') {
      initial[item.id] = { type: 'qualitative', value: 'normal', status: 'normal' };
    } else {
      initial[item.id] = { type: 'quantitative', value: null, status: 'normal' };
    }
  });
  formResults.value = initial;
  extra.value.notes = task.value?.notes || '';
};

const initialiseReviewForm = () => {
  reviewForm.value = {
    pass: true,
    notes: task.value?.reviewNotes || '',
  };
};

const qualitativeOptions = (item: any) => {
  const options = item.qualitativeOptions || { normal: '正常', abnormal: '异常' };
  return [
    { label: options.normal || '正常', value: 'normal' },
    { label: options.abnormal || '异常', value: 'abnormal' },
  ];
};

const selectQualitative = (item: any, value: 'normal' | 'abnormal') => {
  if (!canEdit.value) return;
  formResults.value[item.id] = {
    type: 'qualitative',
    value,
    status: value === 'normal' ? 'normal' : 'abnormal',
  };
};

const handleQuantitativeChange = (item: any) => {
  const entry = formResults.value[item.id];
  if (!entry) return;
  const value = Number(entry.value);
  if (Number.isNaN(value)) {
    entry.status = 'abnormal';
    return;
  }
  const settings = item.quantitativeSettings || {};
  if ((settings.minValue !== undefined && value < settings.minValue) || (settings.maxValue !== undefined && value > settings.maxValue)) {
    entry.status = 'abnormal';
  } else {
    entry.status = 'normal';
  }
};

const isFormCompleted = computed(() => {
  if (!task.value?.plan?.items) return false;
  return task.value.plan.items.every((item: any) => {
    const entry = formResults.value[item.id];
    if (!entry) return false;
    if (item.itemType === 'quantitative') {
      return entry.value !== null && entry.value !== undefined && entry.value !== '';
    }
    return entry.value !== undefined;
  });
});

const canEdit = computed(() => task.value && ['pending', 'in_progress'].includes(task.value.status));
const canReview = computed(() => task.value?.status === 'pending_acceptance');

const submitExecution = async () => {
  if (!task.value) return;
  if (!isFormCompleted.value) {
    ElMessage.warning('请先填写所有保养项目结果');
    return;
  }

  submitting.value = true;
  try {
    const results: Record<string, { type: 'qualitative' | 'quantitative'; value: any; status: 'normal' | 'abnormal' }> = {};
    Object.entries(formResults.value).forEach(([key, value]) => {
      results[key] = {
        type: value.type,
        value: value.type === 'quantitative' ? Number(value.value) : value.value,
        status: value.status,
      };
    });

    await maintenanceService.submitTask(task.value.id, {
      results,
      notes: extra.value.notes,
    });
    ElMessage.success('保养结果已提交');
    await loadTask();
  } catch (error) {
    console.error('提交执行结果失败:', error);
    ElMessage.error('提交执行结果失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
};

const submitReview = async (pass: boolean) => {
  if (!task.value) return;
  if (!pass && !reviewForm.value.notes) {
    ElMessage.warning('请填写驳回原因');
    return;
  }

  reviewForm.value.pass = pass;
  reviewSubmitting.value = true;
  try {
    await maintenanceService.reviewTask(task.value.id, {
      pass,
      notes: reviewForm.value.notes,
    });
    ElMessage.success(pass ? '已通过验收' : '已驳回返工');
    await loadTask();
  } catch (error) {
    console.error('提交验收结果失败:', error);
    ElMessage.error('提交验收结果失败，请稍后重试');
  } finally {
    reviewSubmitting.value = false;
  }
};

watch(
  () => task.value?.status,
  () => {
    initialiseReviewForm();
  }
);

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
    pending: '待执行',
    in_progress: '进行中',
    completed: '已完成',
    pending_acceptance: '待验收',
    cancelled: '已取消',
  };
  return map[status] || status;
};

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    in_progress: 'primary',
    completed: 'success',
    pending_acceptance: 'danger',
    cancelled: 'info',
  };
  return map[status] || 'info';
};

onMounted(() => {
  loadTask();
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

.section.warning {
  border: 1px solid #f56c6c;
  background: #fff5f5;
  color: #f44444;
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

.item-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  background: #fafafa;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.item-name {
  font-weight: 600;
  color: #303133;
}

.qualitative-options {
  display: flex;
  gap: 12px;
}

.qualitative-btn {
  flex: 1;
  padding: 12px 0;
}

.quantitative-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit {
  color: #606266;
}

.range {
  font-size: 12px;
  color: #909399;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  display: inline-block;
  align-self: flex-start;
}

.status-badge.normal {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.status-badge.abnormal {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.bottom-actions {
  position: sticky;
  bottom: 16px;
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bottom-actions .el-button + .el-button {
  margin-left: 0;
}

.empty,
.loading {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.review-section .hint {
  margin: 0 0 10px;
  font-size: 13px;
  color: #909399;
}

@media (max-width: 480px) {
  .mobile-page {
    padding: 12px;
  }

  .bottom-actions {
    bottom: 12px;
  }
}
</style>
