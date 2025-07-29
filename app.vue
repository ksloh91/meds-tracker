<template>
  <div data-theme="cupcake" class="min-h-screen bg-base-200">
    <!-- Show a loading screen until Firebase auth is ready -->
    <div v-if="!authStore.isAuthReady" class="flex items-center justify-center min-h-screen">
      <p>Loading...</p>
    </div>

    <!-- Once ready, show the actual page -->
    <NuxtPage v-else />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
const authStore = useAuthStore();
</script> 