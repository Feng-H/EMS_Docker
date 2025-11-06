<template>
  <div class="mobile-layout">
    <div class="header">
      <h2>设备管理系统</h2>
    </div>
    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
// 移动端布局
</script>

<style scoped>
.mobile-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #409eff;
  color: white;
  padding: 15px;
  text-align: center;
}

.content {
  flex: 1;
  overflow-y: auto;
}
</style>
