import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  Headers,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { getContentRange } from 'src/common/content';
import { VideosService } from './video.service';
import { Video } from 'src/data/video.model';
import { Response } from 'express';

@Controller('api/video')
export class VideosController {
  constructor(private videoService: VideosService) {}

  @Get('/list')
  getList(@Res() response: Response) {
    this.videoService.fileList().subscribe((videos: Video[]) => {
      response.json(videos);
    });
  }

  @Get('/i/:uuid')
  getInfo(@Param() params: { uuid: string }, @Res() response: Response) {
    this.videoService.getInfo(params.uuid).subscribe((video) => {
      response.json(video);
    });
  }

  @Get('/v/:uuid')
  @Header('Accept-Ranges', 'bytes')
  getFile(
    @Param() params: { uuid: string },
    @Headers('range') range: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | NotFoundException> {
    return new Promise((resolve, reject) => {
      try {
        this.videoService
          .getVideoStream(params.uuid, range)
          .subscribe(
            ({
              streamableFile,
              contentStart,
              contentEnd,
              fileSize,
              mimeType,
            }) => {
              response.set({
                'Content-Type': mimeType,
              });

              if (contentStart != undefined && contentEnd != undefined) {
                response.status(206);
                response.set({
                  'Content-Range': getContentRange(
                    contentStart,
                    contentEnd,
                    fileSize,
                  ),
                });
              } else {
                response.set({ 'Content-Length': fileSize });
              }
              resolve(streamableFile);
            },
          );
      } catch (e) {
        reject(new NotFoundException());
      }
    });
  }
}
