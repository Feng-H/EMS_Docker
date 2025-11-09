import { createRouter, createWebHistory } from 'vue-router';
import { isMobile } from '@/utils/device';
import { useAuthStore } from '@/store/auth';
import MobileRepairWorkOrders from '@/views/mobile/RepairWorkOrders.vue';
import MobileRepairHistory from '@/views/mobile/RepairHistory.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        return isMobile() ? '/mobile' : '/desktop';
      },
    },
    {
      path: '/desktop',
      component: () => import('@/views/desktop/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'DesktopHome',
          component: () => import('@/views/desktop/Home.vue'),
        },
        {
          path: 'devices',
          name: 'DesktopDevices',
          component: () => import('@/views/desktop/Devices.vue'),
        },
        {
          path: 'maintenance',
          name: 'DesktopMaintenance',
          component: () => import('@/views/desktop/Maintenance.vue'),
        },
        {
          path: 'work-orders',
          name: 'DesktopWorkOrders',
          component: () => import('@/views/desktop/WorkOrders.vue'),
          meta: { title: '维修管理' },
        },
        {
          path: 'spare-parts',
          name: 'DesktopSpareParts',
          component: () => import('@/views/desktop/SpareParts.vue'),
        },
        {
          path: 'users',
          name: 'DesktopUsers',
          component: () => import('@/views/desktop/Users.vue'),
          meta: { requiresRole: ['工程师', 'admin'] },
        },
        {
          path: 'workshops',
          name: 'DesktopWorkshops',
          component: () => import('@/views/desktop/Workshops.vue'),
        },
      ],
    },
    {
      path: '/mobile',
      component: () => import('@/views/mobile/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/mobile/maintenance/tasks',
        },
        {
          path: 'maintenance',
          redirect: '/mobile/maintenance/tasks',
        },
        {
          path: 'maintenance/tasks',
          name: 'MobileMaintenanceTasks',
          component: () => import('@/views/mobile/MaintenanceTasks.vue'),
          meta: { title: '保养任务' },
        },
        {
          path: 'maintenance/tasks/:id',
          name: 'MobileMaintenanceTaskDetail',
          component: () => import('@/views/mobile/MaintenanceTaskDetail.vue'),
          meta: { title: '保养任务详情' },
        },
        {
          path: 'work-orders',
          name: 'MobileWorkOrders',
          component: MobileRepairWorkOrders,
          meta: { title: '维修工单' },
        },
        {
          path: 'work-orders/:id',
          name: 'MobileWorkOrderDetail',
          component: () => import('@/views/mobile/RepairWorkOrderDetail.vue'),
          meta: { title: '维修工单详情' },
        },
        {
          path: 'work-orders/report',
          name: 'MobileRepairReport',
          component: () => import('@/views/mobile/RepairReport.vue'),
          meta: { title: '设备报修' },
        },
        {
          path: 'work-orders/history',
          name: 'MobileRepairHistory',
          component: MobileRepairHistory,
          meta: { title: '维修记录' },
        },
      ],
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
  ],
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.token) {
    next('/login');
  } else if (to.path === '/login' && authStore.token) {
    next('/');
  } else if (to.meta.requiresRole) {
    // 检查角色权限
    const role = authStore.user?.role?.name || authStore.user?.role;
    if (!role || !to.meta.requiresRole.includes(role)) {
      next('/desktop');
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
