import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { join } from 'path';
import { EnvConfig } from 'src/env';

@Controller('api/thumbnail/')
export class ThumbnailController {
  storagePath: string;
  constructor(configService: ConfigService) {
    this.storagePath = configService.getOrThrow<string>(EnvConfig.storagePath);
  }

  @Get('/{:uuid}.png')
  @Header('Cache-Control', 'none')
  get(@Param() params: { uuid: string }): StreamableFile {
    const path = join(this.storagePath, `${params.uuid}.png`);
    const readStream = createReadStream(path);

    const streamableFile = new StreamableFile(readStream, {
      disposition: `inline; filename="${params.uuid}.png"`,
      type: 'image/png',
    });
    return streamableFile;
  }
}
