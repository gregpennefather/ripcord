<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { VideoFileInfo } from '@/common/videoFileInfo'
import { useRoute } from 'vue-router'
import axios from 'axios'
import VideoPlayer from '@/components/VideoPlayer.vue'

const route = useRoute()
const info = ref()
const loading = ref(true)

const uuid = computed(() => {
  if (Array.isArray(route.params.uuid)) return route.params.uuid[0]
  return route.params.uuid
})

onMounted(() => {
  if (Array.isArray(route.params.uuid)) {
    throw new Error(`Unexpected param value uuid ${route.params.uuid}`)
  }

  axios.get<VideoFileInfo>(`/api/video/i/${uuid.value}`).then((response) => {
    loading.value = false
    if (response.status === 200) {
      info.value = response.data as VideoFileInfo
    } else {
      throw new Error(`Unexpected response from API ${response}`)
    }
  })
})
</script>

<template>
  <main class="w-full justify-center pt-12" style="grid-area: none">
    <VideoPlayer v-if="!loading" :info="info"></VideoPlayer>
  </main>
</template>
