import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideosController } from './video/video.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VideosService } from './video/video.service';
import { SubtitlesController } from './subtitles/subtitles.controller';
import { SubtitlesService } from './subtitles/subtitles.service';
import { ConfigModule } from '@nestjs/config';
import { DataService } from './data/data.service';
import { VideoCrawlerService } from './data/video-data.service';
import { SubtitleDataService } from './data/subtitle-data.service';
import { ThumbnailGenerationService } from './data/thumbnail-generation.service';
import { ThumbnailController } from './thumbnail/thumbnail.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/{*test}', '/assets/{*test}'],
      serveStaticOptions: {
        fallthrough: true,
      },
    }),
    ConfigModule.forRoot(),
  ],
  controllers: [
    AppController,
    VideosController,
    SubtitlesController,
    ThumbnailController,
  ],
  providers: [
    AppService,
    VideosService,
    SubtitlesService,
    VideoCrawlerService,
    SubtitleDataService,
    DataService,
    ThumbnailGenerationService,
  ],
})
export class AppModule {}
