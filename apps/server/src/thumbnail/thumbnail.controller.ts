import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { join } from 'path';
import { EnvConfig } from 'src/env';
import { VideosService } from 'src/video/video.service';

@Controller('api/thumbnail/')
export class ThumbnailController {
  storagePath: string;
  constructor(
    configService: ConfigService) {
    this.storagePath = configService.getOrThrow<string>(
      EnvConfig.storagePath,
    );
  }

  @Get('/:uuid')
  get(@Param() params: { uuid: string},
    ): StreamableFile {
      let path = join(this.storagePath, `${params.uuid}.png`);
      const readStream = createReadStream(path);

      const streamableFile = new StreamableFile(readStream, {
        type: 'image/png',
      });
      return streamableFile;
    }
  }