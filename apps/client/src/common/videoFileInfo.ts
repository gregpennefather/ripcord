export interface VideoFileInfo {
  uuid: string
  fileName: string
  friendlyName: string
  description: string
  mimeType: string
  fileSize: number
  tags: string[]
  subtitles: string[]
}

export interface SubtitleFile {
  lang: string
  path: string
}
