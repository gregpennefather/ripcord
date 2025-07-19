<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue'
import VideoPreview from './VideoPreview.vue'
import type { VideoFileInfo } from '@/common/videoFileInfo'
import axios, { type AxiosResponse } from 'axios'

const infos: Ref<VideoFileInfo[]> = ref([])

const getVideoList = async (): Promise<AxiosResponse<VideoFileInfo[]>> => {
  return axios.get<VideoFileInfo[]>(`/api/video/list`)
}

onMounted(async () => {
  getVideoList().then((response) => {
    infos.value = response.data
  })
})
</script>

<template>
  <div class="grid w-full md:grid-cols-2 sm:grid-cols-1 gap-1 pt-4">
    <VideoPreview v-bind:key="info.uuid" v-for="info in infos" :info="info"></VideoPreview>
  </div>
</template>
