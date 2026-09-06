<template>
  <el-container class="app-layout">
    <el-aside class="app-aside">
      <div class="logo">Clip Apps</div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical-demo"
        router
      >
        <el-menu-item index="/settings">
          <span>全局设置</span>
        </el-menu-item>
        <el-menu-item index="/fdm">
          <span>FDM 工作区</span>
        </el-menu-item>
        <el-menu-item index="/config/fdm">
          <span>FDM 当前配置</span>
        </el-menu-item>
        <el-menu-item index="/devices/fdm">
          <span>FDM 设备</span>
        </el-menu-item>
        <el-menu-item index="/process/fdm">
          <span>FDM 工艺</span>
        </el-menu-item>
        <el-menu-item index="/material/fdm">
          <span>FDM 材料</span>
        </el-menu-item>
        <el-menu-item index="/jobs/fdm">
          <span>FDM Jobs</span>
        </el-menu-item>
        <el-menu-item index="/jobs/carvera">
          <span>Carvera Jobs</span>
        </el-menu-item>
        <el-menu-item index="/jobs/gridbot">
          <span>GridBot Jobs</span>
        </el-menu-item>
        <el-menu-item index="/carvera">
          <span>Carvera 控制</span>
        </el-menu-item>
        <el-menu-item index="/gridbot">
          <span>GridBot 控制</span>
        </el-menu-item>
        <el-menu-item index="/raster">
          <span>Raster 刀路</span>
        </el-menu-item>
        <el-menu-item index="/texturizer">
          <span>STL 纹理</span>
        </el-menu-item>
        <el-menu-item index="/cam">
          <span>CAM 刀路</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="title">管理控制台</div>
        <MigrationProgressBar />
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import MigrationProgressBar from '@/components/migration/MigrationProgressBar.vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-layout {
  height: 100vh;
}
.app-aside {
  border-right: 1px solid #dcdfe6;
  width: 20%;
  min-width: 240px;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid #dcdfe6;
}
.app-main {
  padding: 16px;
  background: #f5f7fa;
}
</style>
