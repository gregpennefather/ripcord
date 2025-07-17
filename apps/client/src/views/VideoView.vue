<script setup lang="ts">
import { onMounted, ref } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import type { VideoFileInfo } from '@/common/videoFileInfo'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()

const info = ref()
const loading = ref(true)

function loadInfo(uuid: string) {
  loading.value = true
  axios.get<VideoFileInfo>(`/api/videos/i/${uuid}`).then((response) => {
    loading.value = false
    console.log(response)
    if (response.status === 200) {
      info.value = response.data as VideoFileInfo
    } else {
      throw new Error(`Unexpected response from API ${response}`)
    }
  })
}

onMounted(() => {
  const uuid = route.params.uuid
  if (Array.isArray(uuid)) {
    throw new Error(`Unexpected param value uuid ${uuid}`)
  }
  loadInfo(uuid)
})
</script>

<template>
  <main>
    <VideoPlayer v-if="!loading" :info="info" />
  </main>
</template>
