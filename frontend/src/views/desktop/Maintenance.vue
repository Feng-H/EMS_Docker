<template>
  <div class="maintenance-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>保养管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增保养计划
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="保养计划" name="plans">
          <div class="filter-bar">
            <el-input
              v-model="searchText"
              placeholder="搜索计划标题、设备编号或设备名称"
              style="width: 300px"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>

          <el-table :data="planList" v-loading="loading" style="width: 100%; margin-top: 20px">
            <el-table-column prop="title" label="计划标题" width="200" />
            <el-table-column prop="devices" label="绑定设备" width="300">
              <template #default="{ row }">
                <div v-if="row.devices && row.devices.length > 0">
                  <div v-for="device in row.devices.slice(0, 2)" :key="device.id" style="margin-bottom: 5px">
                    <div style="font-weight: 500">{{ device.name }}</div>
                    <div style="font-size: 12px; color: #909399">编号：{{ device.assetNo }}</div>
                  </div>
                  <el-tag v-if="row.devices.length > 2" size="small" type="info">
                    +{{ row.devices.length - 2 }}
                  </el-tag>
                </div>
                <span v-else style="color: #909399">未绑定设备</span>
              </template>
            </el-table-column>
            <el-table-column prop="frequencyType" label="保养周期" width="150">
              <template #default="{ row }">
                {{ getFrequencyTypeText(row.frequencyType) }} 每{{ row.frequencyValue }}{{ getFrequencyUnit(row.frequencyType) }}
              </template>
            </el-table-column>
            <el-table-column prop="items" label="保养项数" width="100">
              <template #default="{ row }">
                {{ row.items?.length || 0 }} 项
              </template>
            </el-table-column>
            <el-table-column prop="nextDueAt" label="下次到期" width="150" />
            <el-table-column prop="assignee.name" label="负责人" width="120" />
            <el-table-column prop="active" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.active ? 'success' : 'info'">
                  {{ row.active ? '激活' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="320" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="handleEditPlan(row)">编辑</el-button>
                <el-button type="success" link @click="handleBindDevices(row)">绑定设备</el-button>
                <el-button type="warning" link @click="handleGenerateTasks(row)">生成任务</el-button>
                <el-button type="danger" link @click="handleDeletePlan(row)">删除</el-button>
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
        </el-tab-pane>

        <el-tab-pane label="保养任务" name="tasks">
          <div class="filter-bar">
            <el-input
              v-model="taskSearchText"
              placeholder="搜索设备编号、设备名称或计划标题"
              style="width: 300px"
              clearable
              @clear="handleTaskSearch"
              @keyup.enter="handleTaskSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="handleTaskSearch">搜索</el-button>
          </div>
          <el-table :data="taskList" v-loading="taskLoading" style="width: 100%; margin-top: 20px">
            <el-table-column prop="device.assetNo" label="设备编号" width="150">
              <template #default="{ row }">
                <span v-if="row.device">{{ row.device.assetNo }}</span>
                <span v-else style="color: #909399">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="device.name" label="设备名称" width="150">
              <template #default="{ row }">
                <span v-if="row.device">{{ row.device.name }}</span>
                <span v-else style="color: #909399">设备已删除</span>
              </template>
            </el-table-column>
            <el-table-column prop="plan.title" label="保养计划" width="200">
              <template #default="{ row }">
                <span v-if="row.plan">{{ row.plan.title }}</span>
                <span v-else style="color: #909399">计划已删除</span>
              </template>
            </el-table-column>
            <el-table-column prop="scheduledAt" label="计划时间" width="150" />
            <el-table-column prop="assignee.name" label="负责人" width="120" />
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="异常" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.hasAbnormal" type="danger">有异常</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button v-if="row.status !== 'completed' && row.plan" type="primary" link @click="handleExecuteTask(row)">执行</el-button>
                <el-button v-else-if="row.status !== 'completed'" type="info" link disabled>执行（计划已删除）</el-button>
                <el-button type="primary" link @click="handleViewTask(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新增/编辑保养计划对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px" @close="handleDialogClose">
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="120px">
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          提示：创建保养计划时不需要绑定设备，可以在创建后通过"绑定设备"功能绑定多台设备。
        </el-alert>
        <el-form-item label="计划标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入计划标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="保养周期" prop="frequencyType">
          <div style="display: flex; gap: 10px; align-items: center">
            <el-select v-model="formData.frequencyType" placeholder="请选择周期类型" style="width: 150px">
              <el-option label="班次" value="shift" />
              <el-option label="日" value="daily" />
              <el-option label="周" value="weekly" />
              <el-option label="月" value="monthly" />
              <el-option label="年" value="yearly" />
            </el-select>
            <span>每</span>
            <el-input-number v-model="formData.frequencyValue" :min="1" style="width: 120px" />
            <span>{{ getFrequencyUnit(formData.frequencyType) }}</span>
          </div>
        </el-form-item>
        <el-form-item label="保养内容" prop="items" required>
          <div class="maintenance-items-container">
            <el-alert
              v-if="formData.items.length === 0"
              type="warning"
              :closable="false"
              style="margin-bottom: 10px"
            >
              至少需要添加1项保养内容，最多30项
            </el-alert>
            <el-alert
              v-else-if="formData.items.length >= 30"
              type="info"
              :closable="false"
              style="margin-bottom: 10px"
            >
              已达到最大数量（30项）
            </el-alert>
            <div v-for="(item, index) in formData.items" :key="index" class="maintenance-item-card">
              <div class="item-header">
                <span class="item-index">第 {{ index + 1 }} 项</span>
                <el-button type="danger" link size="small" @click="removeItem(index)">删除</el-button>
              </div>
              <el-form-item :label="'内容名称'" :prop="`items.${index}.name`" style="margin-bottom: 10px">
                <el-input v-model="item.name" placeholder="请输入保养内容名称" />
              </el-form-item>
              <el-form-item label="类型" style="margin-bottom: 10px">
                <el-radio-group v-model="item.itemType">
                  <el-radio label="qualitative">定性</el-radio>
                  <el-radio label="quantitative">定量</el-radio>
                </el-radio-group>
              </el-form-item>
              <!-- 定性选项 -->
              <template v-if="item.itemType === 'qualitative'">
                <el-form-item label="正常选项" style="margin-bottom: 10px">
                  <el-input v-model="item.qualitativeOptions.normal" placeholder="正常" style="width: 200px" />
                </el-form-item>
                <el-form-item label="异常选项" style="margin-bottom: 10px">
                  <el-input v-model="item.qualitativeOptions.abnormal" placeholder="异常" style="width: 200px" />
                </el-form-item>
              </template>
              <!-- 定量选项 -->
              <template v-if="item.itemType === 'quantitative'">
                <el-form-item label="单位" style="margin-bottom: 10px">
                  <el-input v-model="item.quantitativeSettings.unit" placeholder="如：℃, bar, mm" style="width: 200px" />
                </el-form-item>
                <el-form-item label="数值范围" style="margin-bottom: 10px">
                  <div style="display: flex; gap: 10px; align-items: center">
                    <el-input-number v-model="item.quantitativeSettings.minValue" placeholder="最小值" style="width: 150px" />
                    <span>至</span>
                    <el-input-number v-model="item.quantitativeSettings.maxValue" placeholder="最大值" style="width: 150px" />
                  </div>
                </el-form-item>
              </template>
              <el-form-item label="描述" style="margin-bottom: 0">
                <el-input v-model="item.description" type="textarea" :rows="2" placeholder="可选：输入描述说明" />
              </el-form-item>
            </div>
            <el-button type="primary" :disabled="formData.items.length >= 30" @click="addItem" style="margin-top: 10px">
              <el-icon><Plus /></el-icon>
              添加保养项
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 执行保养任务对话框 -->
    <el-dialog v-model="taskDialogVisible" :title="taskDialogTitle" width="800px">
      <div v-if="currentTask && currentTask.plan && currentTask.plan.items">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="设备" :span="2">
            <div v-if="currentTask.device">
              <div style="font-weight: 500">{{ currentTask.device.name }}</div>
              <div style="font-size: 12px; color: #909399; margin-top: 4px">编号：{{ currentTask.device.assetNo }}</div>
            </div>
            <span v-else style="color: #909399">设备已删除</span>
          </el-descriptions-item>
          <el-descriptions-item label="保养计划">{{ currentTask.plan.title }}</el-descriptions-item>
          <el-descriptions-item label="计划时间">{{ currentTask.scheduledAt }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ currentTask.assignee?.name || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>保养内容执行</el-divider>

        <div v-for="(item, index) in currentTask.plan.items" :key="item.id" class="task-item-card">
          <div class="item-title">
            <span class="item-number">{{ index + 1 }}.</span>
            <span class="item-name">{{ item.name }}</span>
            <el-tag size="small" :type="item.itemType === 'qualitative' ? 'info' : 'warning'">
              {{ item.itemType === 'qualitative' ? '定性' : '定量' }}
            </el-tag>
          </div>
          <div v-if="item.description" class="item-description">{{ item.description }}</div>

          <!-- 定性执行 -->
          <div v-if="item.itemType === 'qualitative'" class="item-execution">
            <el-radio-group v-model="taskResults[item.id!]">
              <el-radio :label="'normal'">
                {{ item.qualitativeOptions?.normal || '正常' }}
              </el-radio>
              <el-radio :label="'abnormal'">
                {{ item.qualitativeOptions?.abnormal || '异常' }}
              </el-radio>
            </el-radio-group>
          </div>

          <!-- 定量执行 -->
          <div v-if="item.itemType === 'quantitative'" class="item-execution">
            <div style="display: flex; gap: 10px; align-items: center">
              <el-input-number
                v-model="taskResults[item.id!]"
                :precision="2"
                style="width: 200px"
                placeholder="请输入数值"
              />
              <span>{{ item.quantitativeSettings?.unit || '' }}</span>
              <span v-if="item.quantitativeSettings?.minValue !== undefined || item.quantitativeSettings?.maxValue !== undefined" class="value-range">
                (范围: {{ item.quantitativeSettings?.minValue ?? '无下限' }} ~ {{ item.quantitativeSettings?.maxValue ?? '无上限' }})
              </span>
            </div>
            <el-alert
              v-if="checkValueOutOfRange(item)"
              type="error"
              :closable="false"
              style="margin-top: 5px"
            >
              数值超出范围，将自动生成异常工单
            </el-alert>
          </div>
        </div>

        <el-form-item label="备注" style="margin-top: 20px">
          <el-input v-model="taskNotes" type="textarea" :rows="3" placeholder="可选：输入备注信息" />
        </el-form-item>
      </div>

      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitTask" :loading="taskSubmitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 绑定设备对话框 -->
    <el-dialog v-model="bindDevicesDialogVisible" title="绑定设备" width="600px">
      <div v-if="currentBindPlan">
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          保养计划：{{ currentBindPlan.title }}<br>
          一个保养计划可以绑定多台设备，绑定后将为每台设备生成对应的保养任务。
        </el-alert>
        <el-form-item label="选择设备">
          <el-select
            v-model="selectedDeviceIds"
            placeholder="请选择设备（可多选）"
            filterable
            multiple
            style="width: 100%"
          >
            <el-option
              v-for="device in deviceOptions"
              :key="device.id"
              :label="`${device.name} (${device.assetNo})`"
              :value="device.id"
            />
          </el-select>
        </el-form-item>
        <div v-if="selectedDeviceIds.length > 0" style="margin-top: 15px">
          <div style="font-weight: bold; margin-bottom: 10px">已选择 {{ selectedDeviceIds.length }} 台设备：</div>
          <el-tag
            v-for="deviceId in selectedDeviceIds"
            :key="deviceId"
            closable
            @close="selectedDeviceIds = selectedDeviceIds.filter(id => id !== deviceId)"
            style="margin-right: 10px; margin-bottom: 5px"
          >
            {{ deviceOptions.find(d => d.id === deviceId)?.name }}
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="bindDevicesDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitBindDevices">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import { maintenanceService, type MaintenancePlan, type MaintenanceTask, type MaintenanceItem } from '@/services/maintenance';
import { deviceService } from '@/services/devices';

const loading = ref(false);
const taskLoading = ref(false);
const activeTab = ref('plans');
const planList = ref<MaintenancePlan[]>([]);
const taskList = ref<MaintenanceTask[]>([]);
const searchText = ref('');
const taskSearchText = ref('');
const dialogVisible = ref(false);
const dialogTitle = ref('新增保养计划');
const submitting = ref(false);
const formRef = ref();
const deviceOptions = ref<any[]>([]);

const taskDialogVisible = ref(false);
const taskDialogTitle = ref('执行保养任务');
const taskSubmitting = ref(false);
const currentTask = ref<MaintenanceTask | null>(null);
const taskResults = ref<Record<number, string | number>>({});
const taskNotes = ref('');

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const formData = reactive({
  title: '',
  description: '',
  frequencyType: 'monthly',
  frequencyValue: 1,
  active: true,
  items: [] as MaintenanceItem[],
});

const rules = {
  title: [{ required: true, message: '请输入计划标题', trigger: 'blur' }],
  frequencyType: [{ required: true, message: '请选择频率类型', trigger: 'change' }],
  frequencyValue: [{ required: true, message: '请输入频率值', trigger: 'blur' }],
  items: [
    {
      validator: (rule: any, value: MaintenanceItem[], callback: any) => {
        if (!value || value.length < 1) {
          callback(new Error('至少需要添加1项保养内容'));
        } else if (value.length > 30) {
          callback(new Error('保养内容最多30项'));
        } else {
          // 验证每项内容
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (!item.name || !item.name.trim()) {
              callback(new Error(`第${i + 1}项保养内容名称不能为空`));
              return;
            }
            if (item.itemType === 'qualitative') {
              if (!item.qualitativeOptions?.normal || !item.qualitativeOptions?.abnormal) {
                callback(new Error(`第${i + 1}项定性内容需要设置正常和异常选项`));
                return;
              }
            } else if (item.itemType === 'quantitative') {
              if (!item.quantitativeSettings?.unit) {
                callback(new Error(`第${i + 1}项定量内容需要设置单位`));
                return;
              }
            }
          }
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

let currentEditId: number | null = null;

const getFrequencyTypeText = (type: string) => {
  const map: Record<string, string> = {
    shift: '班次',
    daily: '日',
    weekly: '周',
    monthly: '月',
    yearly: '年',
  };
  return map[type] || type;
};

const getFrequencyUnit = (type: string) => {
  const map: Record<string, string> = {
    shift: '个班次',
    daily: '天',
    weekly: '周',
    monthly: '月',
    yearly: '年',
  };
  return map[type] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待执行',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    overdue: '已逾期',
  };
  return map[status] || status;
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
    overdue: 'danger',
  };
  return map[status] || '';
};

const addItem = () => {
  if (formData.items.length >= 30) {
    ElMessage.warning('最多只能添加30项保养内容');
    return;
  }
  formData.items.push({
    name: '',
    itemType: 'qualitative',
    qualitativeOptions: {
      normal: '正常',
      abnormal: '异常',
    },
    quantitativeSettings: {
      unit: '',
    },
    sortOrder: formData.items.length,
  });
};

const removeItem = (index: number) => {
  formData.items.splice(index, 1);
  // 更新排序
  formData.items.forEach((item, idx) => {
    item.sortOrder = idx;
  });
};

const checkValueOutOfRange = (item: MaintenanceItem): boolean => {
  if (item.itemType !== 'quantitative' || !item.quantitativeSettings) {
    return false;
  }
  const value = taskResults.value[item.id!];
  if (typeof value !== 'number') {
    return false;
  }
  const settings = item.quantitativeSettings;
  if (settings.minValue !== undefined && value < settings.minValue) {
    return true;
  }
  if (settings.maxValue !== undefined && value > settings.maxValue) {
    return true;
  }
  return false;
};

const loadPlans = async () => {
  loading.value = true;
  try {
    const response = await maintenanceService.getPlans({
      page: pagination.page,
      limit: pagination.limit,
      search: searchText.value || undefined,
    });
    planList.value = response.data;
    pagination.total = response.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const loadTasks = async () => {
  taskLoading.value = true;
  try {
    const response = await maintenanceService.getTasks({
      page: 1,
      limit: 1000,
      search: taskSearchText.value || undefined,
    });
    taskList.value = response.data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    taskLoading.value = false;
  }
};

const handleTaskSearch = () => {
  loadTasks();
};

const loadDevices = async () => {
  try {
    const response = await deviceService.getList({ limit: 1000 });
    deviceOptions.value = response.data;
  } catch (error) {
    console.error('加载设备列表失败', error);
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadPlans();
};

const handlePageChange = () => {
  loadPlans();
};

const handleSizeChange = () => {
  pagination.page = 1;
  loadPlans();
};

const handleAdd = () => {
  dialogTitle.value = '新增保养计划';
  currentEditId = null;
  Object.assign(formData, {
    title: '',
    description: '',
    frequencyType: 'monthly',
    frequencyValue: 1,
    active: true,
    items: [],
  });
  // 默认添加一项
  addItem();
  dialogVisible.value = true;
};

const handleEditPlan = async (row: MaintenancePlan) => {
  dialogTitle.value = '编辑保养计划';
  currentEditId = row.id;
  
  // 加载完整计划信息（包含items）
  try {
    const plan = await maintenanceService.getPlanById(row.id);
    Object.assign(formData, {
      title: plan.title,
      description: plan.description || '',
      frequencyType: plan.frequencyType,
      frequencyValue: plan.frequencyValue,
      active: plan.active,
      items: plan.items ? plan.items.map(item => ({
        ...item,
        qualitativeOptions: item.qualitativeOptions || { normal: '正常', abnormal: '异常' },
        quantitativeSettings: item.quantitativeSettings || { unit: '' },
      })) : [],
    });
    dialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载计划详情失败');
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true;
      try {
        const submitData = {
          ...formData,
          items: formData.items.map((item, index) => ({
            name: item.name,
            itemType: item.itemType,
            qualitativeOptions: item.itemType === 'qualitative' ? item.qualitativeOptions : undefined,
            quantitativeSettings: item.itemType === 'quantitative' ? item.quantitativeSettings : undefined,
            sortOrder: index,
            description: item.description,
          })),
        };

        if (currentEditId) {
          await maintenanceService.updatePlan(currentEditId, submitData);
          ElMessage.success('更新成功');
        } else {
          await maintenanceService.createPlan(submitData);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadPlans();
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleDeletePlan = async (row: MaintenancePlan) => {
  try {
    await ElMessageBox.confirm('确定要删除该保养计划吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    await maintenanceService.deletePlan(row.id);
    ElMessage.success('删除成功');
    loadPlans();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
};

const handleExecuteTask = async (row: MaintenanceTask) => {
  taskDialogTitle.value = '执行保养任务';
  taskResults.value = {};
  taskNotes.value = '';

  // 加载完整任务信息（包含plan和items）
  try {
    const fullTask = await maintenanceService.getTaskById(row.id);
    
    if (!fullTask) {
      ElMessage.error('任务不存在');
      return;
    }

    if (!fullTask.plan) {
      ElMessage.error('保养计划不存在，无法执行任务');
      return;
    }

    if (!fullTask.plan.items || fullTask.plan.items.length === 0) {
      ElMessage.error('保养计划没有配置保养内容项，无法执行任务');
      return;
    }

    currentTask.value = fullTask;
    // 初始化结果
    fullTask.plan.items.forEach(item => {
      if (item.itemType === 'qualitative') {
        taskResults.value[item.id!] = 'normal';
      } else {
        taskResults.value[item.id!] = 0;
      }
    });
    taskDialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载任务详情失败');
  }
};

const handleSubmitTask = async () => {
  if (!currentTask.value || !currentTask.value.plan || !currentTask.value.plan.items) {
    return;
  }

  // 验证所有项都已填写
  for (const item of currentTask.value.plan.items) {
    if (taskResults.value[item.id!] === undefined || taskResults.value[item.id!] === null) {
      ElMessage.error(`请填写"${item.name}"的执行结果`);
      return;
    }
    if (item.itemType === 'quantitative' && taskResults.value[item.id!] === 0) {
      ElMessage.error(`请填写"${item.name}"的数值`);
      return;
    }
  }

  taskSubmitting.value = true;
  try {
    // 构建提交数据
    const results: Record<string, { type: 'qualitative' | 'quantitative'; value: string | number; status: 'normal' | 'abnormal' }> = {};
    
    for (const item of currentTask.value.plan.items) {
      const value = taskResults.value[item.id!];
      let status: 'normal' | 'abnormal' = 'normal';

      if (item.itemType === 'qualitative') {
        status = value === 'abnormal' ? 'abnormal' : 'normal';
      } else {
        // 检查定量项是否超出范围
        if (checkValueOutOfRange(item)) {
          status = 'abnormal';
        }
      }

      results[item.id!.toString()] = {
        type: item.itemType,
        value: value,
        status: status,
      };
    }

    const result = await maintenanceService.submitTask(currentTask.value.id, {
      results,
      notes: taskNotes.value,
    });

    if (result.hasAbnormal) {
      ElMessage.warning('任务提交成功，检测到异常项，已自动生成异常工单');
    } else {
      ElMessage.success('任务提交成功');
    }

    taskDialogVisible.value = false;
    loadTasks();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '提交失败');
  } finally {
    taskSubmitting.value = false;
  }
};

const handleViewTask = (row: MaintenanceTask) => {
  ElMessage.info('查看任务详情功能开发中...');
};

const bindDevicesDialogVisible = ref(false);
const currentBindPlan = ref<MaintenancePlan | null>(null);
const selectedDeviceIds = ref<number[]>([]);

const handleBindDevices = async (row: MaintenancePlan) => {
  currentBindPlan.value = row;
  try {
    // 加载已绑定的设备
    const devices = await maintenanceService.getPlanDevices(row.id);
    selectedDeviceIds.value = devices.map(d => d.id);
    bindDevicesDialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载设备列表失败');
  }
};

const handleSubmitBindDevices = async () => {
  if (!currentBindPlan.value) return;
  
  try {
    await maintenanceService.bindDevices(currentBindPlan.value.id, selectedDeviceIds.value);
    ElMessage.success('设备绑定成功');
    bindDevicesDialogVisible.value = false;
    loadPlans();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '绑定失败');
  }
};

const handleGenerateTasks = async (row: MaintenancePlan) => {
  try {
    await ElMessageBox.confirm(
      `确定要为保养计划"${row.title}"生成任务吗？\n将为所有绑定的设备生成保养任务。`,
      '生成保养任务',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    );

    const tasks = await maintenanceService.generateTasks(row.id);
    ElMessage.success(`成功生成 ${tasks.length} 个保养任务`);
    loadTasks(); // 刷新任务列表
    loadPlans(); // 刷新计划列表（更新下次到期时间）
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '生成任务失败');
    }
  }
};

const handleDialogClose = () => {
  formRef.value?.resetFields();
};

onMounted(() => {
  loadPlans();
  loadTasks();
  loadDevices();
});
</script>

<style scoped>
.maintenance-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.maintenance-items-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  background: #fafafa;
}

.maintenance-item-card {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.item-index {
  font-weight: bold;
  color: #409eff;
}

.task-item-card {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.item-number {
  font-weight: bold;
  color: #409eff;
  min-width: 30px;
}

.item-name {
  font-weight: 500;
  flex: 1;
}

.item-description {
  color: #909399;
  font-size: 12px;
  margin-bottom: 10px;
}

.item-execution {
  margin-top: 10px;
}

.value-range {
  color: #909399;
  font-size: 12px;
}
</style>
