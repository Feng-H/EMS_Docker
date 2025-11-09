<template>
  <div class="work-orders-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>维修管理</span>
          <div>
            <el-button @click="handleExport" :loading="exporting">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button type="primary" @click="handleReport">
              <el-icon><Plus /></el-icon>
              设备报修
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 全部工单 -->
        <el-tab-pane label="全部工单" name="all">
          <WorkOrderList
            :status-filter="undefined"
            :priority-filter="filterPriority"
            @edit="handleEdit"
            @view="handleView"
            @delete="handleDelete"
            @assign="handleAssign"
            @accept="handleAccept"
            @start="handleStart"
            @complete="handleComplete"
            @acceptance="handleAcceptance"
          />
        </el-tab-pane>

        <!-- 待报修 -->
        <el-tab-pane label="待报修" name="created">
          <WorkOrderList
            status-filter="created"
            @edit="handleEdit"
            @view="handleView"
            @delete="handleDelete"
            @start="handleStart"
          />
        </el-tab-pane>

        <!-- 待执行 -->
        <el-tab-pane label="待执行" name="assigned">
          <WorkOrderList
            status-filter="assigned"
            @edit="handleEdit"
            @view="handleView"
            @accept="handleAccept"
            @start="handleStart"
          />
        </el-tab-pane>

        <!-- 已接受 -->
        <el-tab-pane label="已接受" name="accepted">
          <WorkOrderList
            status-filter="accepted"
            @view="handleView"
            @start="handleStart"
          />
        </el-tab-pane>

        <!-- 执行中 -->
        <el-tab-pane label="执行中" name="in_progress">
          <WorkOrderList
            status-filter="in_progress"
            @view="handleView"
            @complete="handleComplete"
          />
        </el-tab-pane>

        <!-- 待验收 -->
        <el-tab-pane label="待验收" name="pending_acceptance">
          <WorkOrderList
            status-filter="pending_acceptance"
            @view="handleView"
            @acceptance="handleAcceptance"
          />
        </el-tab-pane>

        <!-- 已完成 -->
        <el-tab-pane label="已完成" name="completed">
          <WorkOrderList
            status-filter="completed"
            @view="handleView"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 报修对话框 -->
    <el-dialog v-model="reportDialogVisible" title="设备报修" width="700px">
      <el-form :model="reportForm" :rules="reportRules" ref="reportFormRef" label-width="100px">
        <el-form-item label="设备" prop="deviceId">
          <el-select
            v-model="reportForm.deviceId"
            placeholder="请选择设备"
            filterable
            clearable
            style="width: 100%"
            @change="handleDeviceChange"
          >
            <el-option
              v-for="device in deviceOptions"
              :key="device.id"
              :label="`${device.assetNo} - ${device.name}`"
              :value="device.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="故障标题" prop="title">
          <el-input v-model="reportForm.title" placeholder="请输入故障标题" />
        </el-form-item>
        <el-form-item label="故障描述" prop="description">
          <el-input
            v-model="reportForm.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述故障现象、发生时间等"
          />
        </el-form-item>
        <el-form-item label="故障分类">
          <el-input v-model="reportForm.faultCategory" placeholder="如：机械故障、电气故障等" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="reportForm.priority">
            <el-radio label="low">低</el-radio>
            <el-radio label="normal">普通</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            :file-list="reportUploadList"
            action="#"
            :auto-upload="false"
            list-type="picture-card"
            :limit="5"
            :on-change="handleReportUploadChange"
            :on-remove="handleReportFileRemove"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="tip">支持图片、视频等附件，最多5个</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReport" :loading="submitting">提交报修</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑工单" width="600px">
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="editForm.title" placeholder="请输入工单标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="editForm.priority" placeholder="请选择优先级">
            <el-option label="低" value="low" />
            <el-option label="普通" value="normal" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="分配负责人">
          <el-select v-model="editForm.assignedTo" placeholder="请选择负责人" filterable clearable style="width: 100%">
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="`${user.name} (${user.username})`"
              :value="user.id"
            />
          </el-select>
          <div style="font-size: 12px; color: #909399; margin-top: 5px">
            分配负责人后，工单状态将自动变为"待执行"
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitEdit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="工单详情" width="800px">
      <WorkOrderDetail v-if="currentOrder" :order="currentOrder" @refresh="handleRefresh" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Download } from '@element-plus/icons-vue';
import type { UploadFile, UploadFiles } from 'element-plus/es/components/upload/src/upload.type';
import { workOrderService, type WorkOrder } from '@/services/workOrders';
import { deviceService } from '@/services/devices';
import { userService } from '@/services/users';
import WorkOrderList from './components/WorkOrderList.vue';
import WorkOrderDetail from './components/WorkOrderDetail.vue';

const activeTab = ref('all');
const filterPriority = ref('');
const reportDialogVisible = ref(false);
const editDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const submitting = ref(false);
const exporting = ref(false);
const reportFormRef = ref();
const editFormRef = ref();
const deviceOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const currentOrder = ref<WorkOrder | null>(null);
const currentEditId = ref<number | null>(null);

const reportForm = reactive({
  deviceId: undefined as number | undefined,
  title: '',
  description: '',
  faultCategory: '',
  priority: 'normal',
  attachments: [] as string[],
});
const reportUploadList = ref<UploadFiles>([]);

const editForm = reactive({
  title: '',
  description: '',
  priority: 'normal',
  assignedTo: undefined as number | undefined,
});

const reportRules = {
  deviceId: [{ required: true, message: '请选择设备', trigger: 'change' }],
  title: [{ required: true, message: '请输入故障标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入故障描述', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

const editRules = {
  title: [{ required: true, message: '请输入工单标题', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

const loadDevices = async () => {
  try {
    const response = await deviceService.getList({ limit: 1000 });
    deviceOptions.value = response.data;
  } catch (error) {
    console.error('加载设备列表失败', error);
  }
};

const loadUsers = async () => {
  try {
    const response = await userService.getList({ limit: 1000 });
    userOptions.value = response.data;
  } catch (error) {
    console.error('加载用户列表失败', error);
  }
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const syncReportAttachments = async (fileList: UploadFiles) => {
  const validFiles = fileList.filter((item) => item.raw).slice(0, 5);
  try {
    const base64List = await Promise.all(
      validFiles.map(async (item) => {
        const base64 = await readFileAsBase64(item.raw as File);
        const mime = (item.raw as File).type || 'application/octet-stream';
        return `${mime}:${base64}`;
      }),
    );
    reportForm.attachments = base64List;
  } catch (error) {
    console.error('读取附件失败:', error);
    ElMessage.error('读取附件失败，请重试');
    reportForm.attachments = [];
    reportUploadList.value = [];
  }
};

const handleReportUploadChange = async (_file: UploadFile, fileList: UploadFiles) => {
  reportUploadList.value = fileList;
  await syncReportAttachments(fileList);
};

const handleReportFileRemove = async (_file: UploadFile, fileList: UploadFiles) => {
  reportUploadList.value = fileList;
  await syncReportAttachments(fileList);
};

const handleTabChange = (name: string) => {
  // 标签切换时刷新列表由子组件处理
};

const handleReport = () => {
  Object.assign(reportForm, {
    deviceId: undefined,
    title: '',
    description: '',
    faultCategory: '',
    priority: 'normal',
    attachments: [],
  });
  reportUploadList.value = [];
  reportDialogVisible.value = true;
};

const handleDeviceChange = (deviceId: number) => {
  const device = deviceOptions.value.find(d => d.id === deviceId);
  if (device) {
    reportForm.title = `${device.name} 故障报修`;
  }
};

const handleSubmitReport = async () => {
  if (!reportFormRef.value) return;
  
  await reportFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true;
      try {
        await workOrderService.create({
          deviceId: reportForm.deviceId,
          title: reportForm.title,
          description: reportForm.description,
          faultCategory: reportForm.faultCategory || undefined,
          priority: reportForm.priority,
          attachments: reportForm.attachments,
        });
        ElMessage.success('报修成功');
        reportDialogVisible.value = false;
        handleRefresh();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '报修失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleEdit = (order: WorkOrder) => {
  currentEditId.value = order.id;
  Object.assign(editForm, {
    title: order.title,
    description: order.description || '',
    priority: order.priority,
    assignedTo: order.assignedTo,
  });
  editDialogVisible.value = true;
};

const handleSubmitEdit = async () => {
  if (!editFormRef.value || !currentEditId.value) return;
  
  await editFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true;
      try {
        const updateData: any = {
          title: editForm.title,
          description: editForm.description,
          priority: editForm.priority,
        };

        // 如果分配了负责人，且工单状态是 created，则自动变为 assigned
        if (editForm.assignedTo) {
          updateData.assignedTo = editForm.assignedTo;
          // 如果当前状态是 created，则自动变为 assigned
          const currentOrder = await workOrderService.getById(currentEditId.value!);
          if (currentOrder.status === 'created') {
            updateData.status = 'assigned';
          }
        } else {
          // 如果取消分配，清空 assignedTo
          updateData.assignedTo = null;
        }

        await workOrderService.update(currentEditId.value!, updateData);
        ElMessage.success('更新成功');
        editDialogVisible.value = false;
        handleRefresh();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '更新失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleView = async (order: WorkOrder) => {
  try {
    const detail = await workOrderService.getById(order.id);
    currentOrder.value = detail;
    detailDialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载详情失败');
  }
};

const handleDelete = async (order: WorkOrder) => {
  try {
    await workOrderService.delete(order.id);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '删除失败');
  }
};

const handleAssign = async (order: WorkOrder) => {
  ElMessage.info('分配功能开发中，请使用编辑功能手动分配');
};

const handleAccept = async (order: WorkOrder) => {
  try {
    await workOrderService.update(order.id, { status: 'accepted' });
    ElMessage.success('已接受工单');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

const handleStart = async (order: WorkOrder) => {
  try {
    // 如果工单状态是 created 且没有分配负责人，提示先分配
    if (order.status === 'created' && !order.assignedTo) {
      try {
        await ElMessageBox.confirm(
          '该工单尚未分配负责人，是否直接开始执行？',
          '提示',
          {
            confirmButtonText: '直接开始',
            cancelButtonText: '先分配',
            type: 'warning',
          }
        );
      } catch {
        // 用户选择先分配，打开编辑对话框
        handleEdit(order);
        return;
      }
    }
    
    await workOrderService.update(order.id, { status: 'in_progress' });
    ElMessage.success('已开始执行');
    handleRefresh();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败');
    }
  }
};

const handleComplete = async (order: WorkOrder) => {
  // 检查是否已填写故障原因和解决方案
  if (!order.faultCause || !order.faultCause.trim()) {
    ElMessage.warning('请先在工单详情中填写故障原因');
    handleView(order); // 打开详情页让用户填写
    return;
  }
  if (!order.solution || !order.solution.trim()) {
    ElMessage.warning('请先在工单详情中填写解决方案');
    handleView(order); // 打开详情页让用户填写
    return;
  }

  try {
    await workOrderService.update(order.id, { status: 'pending_acceptance' });
    ElMessage.success('已完成，等待验收');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

const handleAcceptance = async (order: WorkOrder, approved: boolean) => {
  try {
    if (approved) {
      // 验收通过
      await workOrderService.update(order.id, { status: 'completed' });
      ElMessage.success('验收通过');
    } else {
      // 驳回，回到执行中状态，清空故障原因和解决方案
      await workOrderService.update(order.id, { 
        status: 'in_progress',
        faultCause: '',
        solution: ''
      });
      ElMessage.success('已驳回，工单已回到执行中状态');
    }
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

const handleExport = async () => {
  exporting.value = true;
  try {
    await workOrderService.export();
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error('导出失败: ' + (error.message || '未知错误'));
  } finally {
    exporting.value = false;
  }
};

const handleRefresh = () => {
  // 触发子组件刷新
  const event = new CustomEvent('refresh-work-orders');
  window.dispatchEvent(event);
};

onMounted(() => {
  loadDevices();
  loadUsers();
});
</script>

<style scoped>
.work-orders-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
