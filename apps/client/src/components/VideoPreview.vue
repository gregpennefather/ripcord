<script setup lang="ts">
import Card from 'primevue/card'

import type { VideoFileInfo } from '@/common/videoFileInfo'
import { onMounted, reactive, ref } from 'vue'
const props = defineProps<{
  info: VideoFileInfo
}>()

const apiUrl = `${window.origin}/api`

const loading = ref(true)

const thumbURL = `${apiUrl}/thumbnail/${props.info.uuid}.png`

const bgStyle = reactive({
  backgroundImage: `url('${thumbURL}')`,
  backgroundPosition: 'center',
})

onMounted(() => {
  loading.value = false
})
</script>

<template>
  <RouterLink :to="`/video/${info.uuid}`">
    <Card :style="bgStyle" class="aspect-video w-full">
      <template #title>{{ info.friendlyName }}</template>
      <template #subtitle>{{ info.uuid }}</template>
      <template #content> </template>
    </Card>
  </RouterLink>
</template>
