<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <header>
    <div class="wrapper">
      <h1>Ripcord</h1>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  position: absolute;
  width: 100%;
  left: 0;
  top: 0;
  color: var(--color-text);
  background-color: var(--color-header);
}

header h1 {
  padding-left: 1em;
}
</style>
