<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import type { VideoFileInfo } from '@/common/videoFileInfo'

const props = defineProps<{
  info: VideoFileInfo
}>()

const apiUrl = `${window.origin}/api`
console.log('videoplayer')

const videoUUID = props.info.uuid
const videoUrl = ref(`${apiUrl}/videos/v/${videoUUID}`)
const mimeType = props.info.mimeType
const video = useTemplateRef('video')
const tracks = ref()

onMounted(() => {
  console.log('mounted')
  console.log(video.value)
  tracks.value = video.value?.textTracks ?? []
})
</script>

<template>
  <video id="video" ref="video" controls autoplay :src="videoUrl" preload="metadata">
    <source :src="videoUrl" :type="mimeType" />
    <track
      v-for="subtitle in props.info.subtitles"
      v-bind:key="subtitle.lang"
      kind="subtitles"
      :srclang="subtitle.lang"
      :src="`${apiUrl}/subtitles/${videoUUID}/${subtitle.lang}`"
      default
    />
  </video>
  <!-- <video playsinline controls src="{{videoUrl}}" id="video-stream" width="100%"></video> -->
</template>
