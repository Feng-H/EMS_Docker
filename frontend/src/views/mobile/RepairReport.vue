<template>
  <div class="mobile-page">
    <div class="page-header">
      <el-button text @click="goBack" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>设备报修</h2>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" class="report-form">
      <el-form-item label="设备" prop="deviceId">
        <el-select
          v-model="form.deviceId"
          filterable
          placeholder="选择报修设备"
          style="width: 100%"
          @visible-change="handleDeviceDropdown"
        >
          <el-option
            v-for="device in deviceOptions"
            :key="device.id"
            :label="`${device.assetNo || ''} ${device.name || ''}`"
            :value="device.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="工单标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入工单标题，便于识别" />
      </el-form-item>

      <el-form-item label="故障描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 6 }"
          placeholder="请详细描述故障情况"
        />
      </el-form-item>

      <el-form-item label="优先级" prop="priority">
        <el-radio-group v-model="form.priority" class="priority-group">
          <el-radio-button label="normal">普通</el-radio-button>
          <el-radio-button label="high">高</el-radio-button>
          <el-radio-button label="urgent">紧急</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="联系方式" prop="contact">
        <el-input v-model="form.contact" placeholder="填写报修人联系方式" />
      </el-form-item>

      <el-form-item label="上传照片">
        <el-upload
          class="upload"
          action="#"
          :auto-upload="false"
          multiple
          :limit="3"
          :file-list="uploadFileList"
          :on-change="handleUploadChange"
          :on-remove="handleFileRemove"
          accept="image/*"
        >
          <el-button type="primary" plain>选择照片</el-button>
          <template #tip>
            <div class="upload-tip">可上传现场照片（最多 3 张）</div>
          </template>
        </el-upload>
        <div v-if="previewImages.length" class="preview-list">
          <div v-for="(url, index) in previewImages" :key="index" class="preview-item">
            <img :src="url" alt="报修照片预览" />
          </div>
        </div>
      </el-form-item>

      <div class="bottom-actions">
        <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
          提交报修
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import type { UploadFile, UploadFiles } from 'element-plus/es/components/upload/src/upload.type';
import { deviceService, type Device } from '@/services/devices';
import { workOrderService } from '@/services/workOrders';

const router = useRouter();

const formRef = ref();
const form = reactive({
  deviceId: null as number | null,
  title: '',
  description: '',
  priority: 'normal',
  contact: '',
  attachments: [] as string[],
});

const rules = {
  deviceId: [{ required: true, message: '请选择报修设备', trigger: 'change' }],
  title: [{ required: true, message: '请输入工单标题', trigger: 'blur' }],
  description: [{ required: true, message: '请填写故障描述', trigger: 'blur' }],
};

const submitting = ref(false);
const uploadFileList = ref<UploadFiles>([]);
const deviceOptions = ref<Device[]>([]);
const previewImages = computed(() =>
  form.attachments.map((item) => {
    const [mime, data] = item.split(':');
    return `data:${mime};base64,${data}`;
  }),
);

const goBack = () => {
  router.back();
};

const loadDevices = async () => {
  try {
    const response = await deviceService.getList({ page: 1, limit: 200 });
    deviceOptions.value = response.data || [];
  } catch (error) {
    console.error('加载设备列表失败:', error);
  }
};

const handleDeviceDropdown = (visible: boolean) => {
  if (visible && deviceOptions.value.length === 0) {
    loadDevices();
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

const syncAttachments = async (fileList: UploadFiles) => {
  const validFiles = fileList.filter((item) => item.raw).slice(0, 3);
  try {
    const base64List = await Promise.all(
      validFiles.map(async (item) => {
        const base64 = await readFileAsBase64(item.raw as File);
        const mime = (item.raw as File).type || 'application/octet-stream';
        return `${mime}:${base64}`;
      }),
    );
    form.attachments = base64List;
  } catch (error) {
    console.error('读取附件失败:', error);
    ElMessage.error('读取照片失败，请重试');
    form.attachments = [];
    uploadFileList.value = [];
  }
};

const handleUploadChange = async (_file: UploadFile, fileList: UploadFiles) => {
  uploadFileList.value = fileList;
  await syncAttachments(fileList);
};

const handleFileRemove = async (_file: UploadFile, fileList: UploadFiles) => {
  uploadFileList.value = fileList;
  await syncAttachments(fileList);
};

const handleSubmit = () => {
  if (!formRef.value) return;
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    submitting.value = true;
    try {
      await workOrderService.create({
        deviceId: form.deviceId!,
        title: form.title,
        description: form.description,
        priority: form.priority,
        contact: form.contact,
        attachments: form.attachments,
      });
      ElMessage.success('报修已提交');
      router.push('/mobile/work-orders');
    } catch (error: any) {
      console.error('提交报修失败:', error);
      ElMessage.error(error?.response?.data?.message || '提交失败，请稍后重试');
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(() => {
  loadDevices();
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

.report-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.priority-group {
  width: 100%;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

.preview-list {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.preview-item {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bottom-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
