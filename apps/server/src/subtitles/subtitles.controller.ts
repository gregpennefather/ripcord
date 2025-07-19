import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { join } from 'path';
import { EnvConfig } from 'src/env';

@Controller('api/subtitles')
export class SubtitlesController {
  storagePath: string;
  constructor(configService: ConfigService) {
    this.storagePath = configService.getOrThrow<string>(EnvConfig.storagePath);
  }
  @Get('/:uuid/:lang')
  getFile(@Param() params: { uuid: string; lang: string }): StreamableFile {
    const path = join(this.storagePath, `${params.uuid}.${params.lang}.vtt`);
    const readStream = createReadStream(path);

    const streamableFile = new StreamableFile(readStream, {
      type: 'text/vtt',
    });

    return streamableFile;
  }
}
