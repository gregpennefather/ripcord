import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  StreamableFile,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { getContentRange } from 'src/common/content';
import { VideosService } from './video.service';

@Controller('api/video')
export class VideosController {
  constructor(private videoService: VideosService) {}

  @Get('/list')
  async getList() {
    const fileList = await this.videoService.fileList();

    return fileList;
  }

  @Get('/i/:uuid')
  async getInfo(
    @Param() params: { uuid: string },
    @Res({ passthrough: true }) response,
  ) {
    const info = await this.videoService.getInfo(params.uuid);
    if (info === undefined) {
      response.status(404);
    } else {
      return info;
    }
  }

  @Get('/v/:uuid')
  @Header('Accept-Ranges', 'bytes')
  async getFile(
    @Param() params: { uuid: string },
    @Headers('range') range: string,
    @Res({ passthrough: true }) response,
  ): Promise<StreamableFile> {
    const videoInfo = await this.videoService.getInfo(params.uuid);
    if (!videoInfo) {
      throw new NotFoundException();
    }

    const { streamableFile, contentStart, contentEnd, fileSize, mimeType } =
      await this.videoService.getVideoStream(videoInfo, range);

    response.set({
      'Content-Type': mimeType,
    });

    if (contentStart != undefined && contentEnd != undefined) {
      response.status(206);
      response.set({
        'Content-Range': getContentRange(contentStart, contentEnd, fileSize),
      });
    }

    return streamableFile;
  }
}
