import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideosController } from './videos/videos.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VideosService } from './videos/videos.service';
import { SubtitlesController } from './subtitles/subtitles.controller';
import { SubtitlesService } from './subtitles/subtitles.service';
import { VideoDAL } from './videos/videoDAL';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'client'),
      exclude: ['/api/{*test}'],
      serveStaticOptions: {
        fallthrough: true,
      },
    }),
    ConfigModule.forRoot()
  ],
  controllers: [AppController, VideosController, SubtitlesController],
  providers: [AppService, VideosService, SubtitlesService, VideoDAL],
})
export class AppModule {}
