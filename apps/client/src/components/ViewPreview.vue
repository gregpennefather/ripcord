<script setup lang="ts">
import { AspectRatio } from 'reka-ui'
import type { VideoFileInfo } from '@/common/videoFileInfo'
import { computed, onMounted, ref } from 'vue'
const props = defineProps<{
  video: VideoFileInfo
}>()

const loading = ref(true)

const thumbURL = computed(() => `url/t/${props.video.uuid}`)

onMounted(() => {})
</script>

<template>
  <AspectRatio v-if="!loading" :ratio="16 / 9">
    <image :src="thumbURL"></image>
    <div></div>
  </AspectRatio>
</template>
