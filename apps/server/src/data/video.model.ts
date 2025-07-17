export interface Video {
  uuid: string;
  path: string;
  baseName: string;
  fileName: string;
  friendlyName: string;
  description: string;
  mimeType: string;
  fileSize: number;
  tags: string[];
  subtitles: string[];
}
