import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { VideosService } from 'src/video/video.service';

@Controller('api/subtitles')
export class SubtitlesController {
  constructor(private videosService: VideosService) {}

  @Get('/:uuid/:lang')
  async getFile(
    @Param() params: { uuid: string; lang: string },
  ): Promise<StreamableFile> {
    const videoInfo = await this.videosService.getInfo(params.uuid);
    const subtitleFile = videoInfo!.subtitles.find(
      (f) => f.lang == params.lang,
    );
    const readStream = createReadStream(subtitleFile!.path);

    const streamableFile = new StreamableFile(readStream, {
      type: 'text/vtt',
    });
    return streamableFile;
  }
}
