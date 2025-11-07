<template>
  <div class="dashboard-container" ref="dashboardRef">
    <!-- 顶部标题栏 -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">设备管理系统 - 数据大屏</h1>
      <div class="dashboard-actions">
        <div class="dashboard-time">{{ currentTime }}</div>
        <el-button type="primary" plain @click="toggleFullscreen">
          <el-icon style="margin-right: 6px"><component :is="isFullscreen ? Close : FullScreen" /></el-icon>
          {{ isFullscreen ? '退出全屏' : '全屏展示' }}
        </el-button>
      </div>
    </div>

    <!-- 统计卡片区域 -->
    <div class="stats-row">
      <!-- 设备统计 -->
      <div class="stat-card device-card">
        <div class="stat-icon">
          <el-icon :size="40"><Setting /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">设备总数</div>
          <div class="stat-value">{{ deviceStats.total || 0 }}</div>
        </div>
      </div>

      <!-- 保养任务统计 -->
      <div class="stat-card maintenance-card">
        <div class="stat-icon">
          <el-icon :size="40"><Tools /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">保养任务</div>
          <div class="stat-value">{{ maintenanceStats.totalTasks || 0 }}</div>
        </div>
      </div>

      <!-- 维修工单统计 -->
      <div class="stat-card workorder-card">
        <div class="stat-icon">
          <el-icon :size="40"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">维修工单</div>
          <div class="stat-value">{{ workOrderStats.total || 0 }}</div>
        </div>
      </div>

      <!-- 备件统计 -->
      <div class="stat-card sparepart-card">
        <div class="stat-icon">
          <el-icon :size="40"><Box /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">备件总数</div>
          <div class="stat-value">{{ sparePartStats.total || 0 }}</div>
        </div>
      </div>

      <!-- 人员统计 -->
      <div class="stat-card user-card">
        <div class="stat-icon">
          <el-icon :size="40"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">在线人员</div>
          <div class="stat-value">{{ userStats.online || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <!-- 左侧列 -->
      <div class="charts-left">
        <!-- 设备状态分布 -->
        <div class="chart-card">
          <div class="chart-title">设备状态分布</div>
          <div ref="deviceChartRef" class="chart-container"></div>
        </div>

        <!-- 保养任务状态 -->
        <div class="chart-card">
          <div class="chart-title">保养任务状态</div>
          <div ref="maintenanceChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 中间列 -->
      <div class="charts-center">
        <!-- 维修工单状态 -->
        <div class="chart-card">
          <div class="chart-title">维修工单状态</div>
          <div ref="workOrderChartRef" class="chart-container"></div>
        </div>

        <!-- 备件库存预警 -->
        <div class="chart-card">
          <div class="chart-title">备件库存预警</div>
          <div ref="sparePartChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 右侧列 -->
      <div class="charts-right">
        <!-- 人员角色分布 -->
        <div class="chart-card">
          <div class="chart-title">人员角色分布</div>
          <div ref="userChartRef" class="chart-container"></div>
        </div>

        <!-- 在线人员信息 -->
        <div class="chart-card">
          <div class="chart-title">在线人员信息</div>
          <div class="user-list">
            <div class="user-item">
              <el-icon><User /></el-icon>
              <span>{{ authStore.user?.name || '当前用户' }}</span>
              <el-tag type="success" size="small">在线</el-tag>
            </div>
            <div class="user-stats">
              <div class="user-stat-item">
                <span class="label">总人数：</span>
                <span class="value">{{ userStats.total || 0 }}</span>
              </div>
              <div class="user-stat-item">
                <span class="label">活跃人数：</span>
                <span class="value">{{ userStats.active || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { useAuthStore } from '@/store/auth';
import { deviceService } from '@/services/devices';
import { maintenanceService } from '@/services/maintenance';
import { workOrderService } from '@/services/workOrders';
import { sparePartService } from '@/services/spareParts';
import { userService } from '@/services/users';
import { Setting, Tools, Document, Box, User, FullScreen, Close } from '@element-plus/icons-vue';

const authStore = useAuthStore();

// 统计数据
const deviceStats = ref<any>({});
const maintenanceStats = ref<any>({});
const workOrderStats = ref<any>({});
const sparePartStats = ref<any>({});
const lowStockParts = ref<any[]>([]);
const userStats = ref<any>({});

// 图表引用
const deviceChartRef = ref<HTMLElement>();
const maintenanceChartRef = ref<HTMLElement>();
const workOrderChartRef = ref<HTMLElement>();
const sparePartChartRef = ref<HTMLElement>();
const userChartRef = ref<HTMLElement>();

// 图表实例
let deviceChart: any = null;
let maintenanceChart: any = null;
let workOrderChart: any = null;
let sparePartChart: any = null;
let userChart: any = null;

// 当前时间
const currentTime = ref('');
let timeInterval: number | null = null;

// 全屏状态
const dashboardRef = ref<HTMLElement>();
const isFullscreen = ref(false);

// 更新时间
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const toggleFullscreen = async () => {
  if (!dashboardRef.value) return;
  try {
    if (!isFullscreen.value) {
      if (dashboardRef.value.requestFullscreen) {
        await dashboardRef.value.requestFullscreen();
      } else {
        console.warn('当前浏览器不支持全屏 API');
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  } catch (error) {
    console.error('切换全屏失败:', error);
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  setTimeout(() => {
    handleResize();
  }, 200);
};

// 加载统计数据
const loadStatistics = async () => {
  try {
    console.log('开始加载统计数据...');
    const [deviceData, maintenanceData, workOrderData, sparePartData, userData, lowStockData] = await Promise.all([
      deviceService.getStatistics().catch(err => { console.error('设备统计失败:', err); return {}; }),
      maintenanceService.getStatistics().catch(err => { console.error('保养统计失败:', err); return {}; }),
      workOrderService.getStatistics().catch(err => { console.error('工单统计失败:', err); return {}; }),
      sparePartService.getStatistics().catch(err => { console.error('备件统计失败:', err); return {}; }),
      userService.getStatistics().catch(err => { console.error('人员统计失败:', err); return {}; }),
      sparePartService.getLowStock().catch(err => { console.error('低库存备件获取失败:', err); return []; }),
    ]);

    console.log('统计数据加载完成:', {
      deviceData,
      maintenanceData,
      workOrderData,
      sparePartData,
      userData,
    });

    deviceStats.value = deviceData;
    maintenanceStats.value = maintenanceData;
    workOrderStats.value = workOrderData;
    sparePartStats.value = sparePartData;
    lowStockParts.value = Array.isArray(lowStockData) ? lowStockData : [];
    userStats.value = userData;

    // 更新图表
    updateCharts();
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

// 更新图表
const updateCharts = () => {
  // 等待 DOM 更新
  setTimeout(() => {
    // 设备状态分布图
    if (deviceChartRef.value && deviceStats.value && Object.keys(deviceStats.value).length > 0) {
      if (!deviceChart) {
        deviceChart = echarts.init(deviceChartRef.value);
      }
      deviceChart.setOption({
        tooltip: {
          trigger: 'item',
        },
        legend: {
          top: '5%',
          left: 'center',
          textStyle: { color: '#fff' },
        },
        series: [
          {
            name: '设备状态',
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['50%', '60%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#1a1a2e',
              borderWidth: 2,
            },
            label: {
              show: true,
              color: '#fff',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 16,
                fontWeight: 'bold',
              },
            },
            data: [
              { value: deviceStats.value.inUse || 0, name: '在用', itemStyle: { color: '#67c23a' } },
              { value: deviceStats.value.trialRun || 0, name: '试运行', itemStyle: { color: '#409eff' } },
              { value: deviceStats.value.debugging || 0, name: '调试', itemStyle: { color: '#e6a23c' } },
              { value: deviceStats.value.sealed || 0, name: '封存', itemStyle: { color: '#909399' } },
              { value: deviceStats.value.scrapped || 0, name: '报废', itemStyle: { color: '#f56c6c' } },
            ],
          },
        ],
      });
    }

    // 保养任务状态图
    if (maintenanceChartRef.value && maintenanceStats.value && Object.keys(maintenanceStats.value).length > 0) {
      if (!maintenanceChart) {
        maintenanceChart = echarts.init(maintenanceChartRef.value);
      }
      maintenanceChart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
        },
        grid: {
          top: '12%',
          left: '4%',
          right: '4%',
          bottom: '6%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: ['待处理', '进行中', '已完成', '已逾期'],
          axisLabel: { color: '#fff' },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#fff' },
        },
        series: [
          {
            name: '任务数量',
            type: 'bar',
            data: [
              maintenanceStats.value.pendingTasks || 0,
              maintenanceStats.value.inProgressTasks || 0,
              maintenanceStats.value.completedTasks || 0,
              maintenanceStats.value.overdueTasks || 0,
            ],
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#83bff6' },
                { offset: 0.5, color: '#188df0' },
                { offset: 1, color: '#188df0' },
              ]),
            },
          },
        ],
      });
    }

    // 维修工单状态图
    if (workOrderChartRef.value && workOrderStats.value && Object.keys(workOrderStats.value).length > 0) {
      if (!workOrderChart) {
        workOrderChart = echarts.init(workOrderChartRef.value);
      }
      workOrderChart.setOption({
        tooltip: {
          trigger: 'item',
        },
        legend: {
          top: '5%',
          left: 'center',
          textStyle: { color: '#fff' },
        },
        series: [
          {
            name: '工单状态',
            type: 'pie',
            radius: '55%',
            center: ['50%', '60%'],
            data: [
              { value: workOrderStats.value.created || 0, name: '已创建', itemStyle: { color: '#909399' } },
              { value: workOrderStats.value.assigned || 0, name: '已分配', itemStyle: { color: '#409eff' } },
              { value: workOrderStats.value.accepted || 0, name: '已接受', itemStyle: { color: '#e6a23c' } },
              { value: workOrderStats.value.inProgress || 0, name: '进行中', itemStyle: { color: '#67c23a' } },
              { value: workOrderStats.value.pendingAcceptance || 0, name: '待验收', itemStyle: { color: '#f56c6c' } },
              { value: workOrderStats.value.completed || 0, name: '已完成', itemStyle: { color: '#13ce66' } },
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      });
    }

    // 备件库存预警图
    if (sparePartChartRef.value) {
      if (!sparePartChart) {
        sparePartChart = echarts.init(sparePartChartRef.value);
      }
      if (lowStockParts.value.length > 0) {
        const categories = lowStockParts.value.map((item) => item.name || item.partNo);
        const stockValues = lowStockParts.value.map((item) => Number(item.stockQty) || 0);
        const minValues = lowStockParts.value.map((item) => Number(item.minStock) || 0);

        sparePartChart.setOption({
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
          },
          legend: {
            top: '5%',
            left: 'center',
            textStyle: { color: '#fff' },
          },
          grid: {
            top: '18%',
            left: '6%',
            right: '6%',
            bottom: '10%',
            containLabel: true,
          },
          xAxis: {
            type: 'value',
            axisLabel: { color: '#fff' },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          },
          yAxis: {
            type: 'category',
            data: categories,
            axisLabel: {
              color: '#fff',
              width: 120,
              overflow: 'truncate',
            },
          },
          series: [
            {
              name: '预警库存',
              type: 'bar',
              data: minValues,
              itemStyle: {
                color: '#f56c6c',
              },
              barWidth: 14,
            },
            {
              name: '当前库存',
              type: 'bar',
              data: stockValues,
              itemStyle: {
                color: '#67c23a',
              },
              barWidth: 14,
            },
          ],
        });
      } else {
        sparePartChart.setOption({
          title: {
            text: '暂无低库存预警',
            left: 'center',
            top: 'middle',
            textStyle: { color: '#fff', fontSize: 16 },
          },
          tooltip: {},
          legend: {},
          series: [],
        });
      }
    }

    // 人员角色分布图
    if (userChartRef.value && userStats.value && Object.keys(userStats.value).length > 0) {
      if (!userChart) {
        userChart = echarts.init(userChartRef.value);
      }
      const roleData = (userStats.value.roleStats || []).map((r: any) => ({
        value: r.count,
        name: r.role,
      }));
      userChart.setOption({
        tooltip: {
          trigger: 'item',
        },
        legend: {
          top: '5%',
          left: 'center',
          textStyle: { color: '#fff' },
        },
        series: [
          {
            name: '角色分布',
            type: 'pie',
            radius: '55%',
            center: ['50%', '60%'],
            data: roleData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      });
    }
  }, 100); // 延迟100ms确保DOM已更新
};

// 窗口大小改变时调整图表
const handleResize = () => {
  deviceChart?.resize();
  maintenanceChart?.resize();
  workOrderChart?.resize();
  sparePartChart?.resize();
  userChart?.resize();
};

onMounted(() => {
  updateTime();
  timeInterval = window.setInterval(updateTime, 1000);
  loadStatistics();
  window.addEventListener('resize', handleResize);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  
  // 每30秒刷新一次数据
  const refreshInterval = setInterval(() => {
    loadStatistics();
  }, 30000);
  
  onUnmounted(() => {
    clearInterval(refreshInterval);
  });
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  deviceChart?.dispose();
  maintenanceChart?.dispose();
  workOrderChart?.dispose();
  sparePartChart?.dispose();
  userChart?.dispose();
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  gap: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  gap: 12px;
}

.dashboard-title {
  font-size: 28px;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(90deg, #409eff, #67c23a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dashboard-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dashboard-time {
  font-size: 18px;
  color: #67c23a;
  font-weight: bold;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
  min-width: 180px;
  flex: 1 1 200px;
  box-sizing: border-box;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.stat-icon {
  margin-right: 15px;
  color: #409eff;
}

.device-card .stat-icon {
  color: #409eff;
}

.maintenance-card .stat-icon {
  color: #67c23a;
}

.workorder-card .stat-icon {
  color: #e6a23c;
}

.sparepart-card .stat-icon {
  color: #f56c6c;
}

.user-card .stat-icon {
  color: #13ce66;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 5px;
}

.stat-value {
  font-size: 26px;
  font-weight: bold;
  color: #fff;
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.charts-left,
.charts-center,
.charts-right {
  display: contents;
}

.chart-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 280px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.chart-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #fff;
  text-align: center;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.chart-container {
  width: 100%;
  flex: 1;
  min-height: 220px;
  min-width: 0;
}

.user-list {
  padding: 10px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 12px;
}

.user-item .el-icon {
  font-size: 24px;
  color: #67c23a;
}

.user-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
}

.user-stat-item {
  text-align: center;
}

.user-stat-item .label {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 5px;
}

.user-stat-item .value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #67c23a;
}

@media (max-width: 1200px) {
  .dashboard-container {
    padding: 16px;
    gap: 16px;
  }

  .dashboard-title {
    font-size: 24px;
  }

  .dashboard-time {
    font-size: 16px;
  }

  .dashboard-actions {
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .chart-container {
    min-height: 200px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .stats-row {
    gap: 10px;
  }
}
</style>
