<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import type { VideoFileInfo } from '@/common/videoFileInfo'

const props = defineProps<{
  info: VideoFileInfo
}>()

const apiUrl = `${window.origin}/api`

const videoUrl = ref(`${apiUrl}/video/v/${props.info.uuid}`)
const video$ = useTemplateRef('video')

onMounted(() => {
  for (const track of video$.value?.textTracks ?? []) {
    if (track.language == 'en') {
      track.mode = 'showing'
    }
  }
})
</script>

<template>
  <a :href="videoUrl"
    ><h1>{{ props.info.friendlyName }}</h1></a
  >
  <video
    id="video"
    ref="video"
    :poster="`${apiUrl}/thumbnail/${props.info.uuid}.png`"
    controls
    autoplay
    preload="metadata"
    class="aspect-video w-full"
  >
    <source :src="videoUrl" :type="props.info.mimeType" />
    <track
      v-for="subtitleLang in props.info.subtitles"
      v-bind:key="subtitleLang"
      kind="subtitles"
      :srclang="subtitleLang"
      :src="`${apiUrl}/subtitles/${props.info.uuid}/${subtitleLang}`"
    />
  </video>
</template>
