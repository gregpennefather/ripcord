import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideosController } from './video/video.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VideosService } from './video/video.service';
import { SubtitlesController } from './subtitles/subtitles.controller';
import { SubtitlesService } from './subtitles/subtitles.service';
import { VideoDAL } from './video/videoDAL';
import { ConfigModule } from '@nestjs/config';
import { ThumbnailsController } from './thumbnails/thumbnails.controller';
import { DataService } from './data/data.service';
import { VideoCrawlerService } from './data/video-data.service';
import { SubtitleDataService } from './data/subtitle-data.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/{*test}'],
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
    ThumbnailsController,
  ],
  providers: [
    AppService,
    VideosService,
    SubtitlesService,
    VideoCrawlerService,
    SubtitleDataService,
    DataService,
    VideoDAL,
  ],
})
export class AppModule {}
