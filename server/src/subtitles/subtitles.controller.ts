import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { VideosService } from 'src/videos/videos.service';

@Controller('api/subtitles')
export class SubtitlesController {
    constructor(private videosService: VideosService) {}

    @Get('/:uuid/:lang')
    async getFile(
        @Param() params: { uuid: string, lang: string },
        @Res({ passthrough: true }) response,
    ): Promise<StreamableFile> {
        let videoInfo = await this.videosService.getInfo(params.uuid);
        let subtitleFile = videoInfo!.subtitles.find(f => f.lang == params.lang);
        let readStream = createReadStream(subtitleFile!.path);

        let streamableFile = new StreamableFile(readStream, {
            type: 'text/vtt'
        });
        return streamableFile;
    }
}
