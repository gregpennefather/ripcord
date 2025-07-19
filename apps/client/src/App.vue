<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <header>
    <RouterLink to="/">
      <div class="wrapper">
        <h1>Ripcord</h1>
      </div></RouterLink
    >
  </header>
  <RouterView class="pt-8" />
</template>

<style scoped>
header {
  min-height: 2rem;
  position: absolute;
  width: 100%;
  left: 0;
  top: 0;
  flex: auto;
  align-content: center;
  background-color: var(--color-header);
}

header h1 {
  padding-left: 1em;
  color: var(--color-text);
  font-weight: bolder;
  font-size: large;
}
</style>
