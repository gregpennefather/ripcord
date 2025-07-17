import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataService } from './data.service';
import { Video } from './video.model';
import { EnvConfig } from 'src/env';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { SubtitleDataService } from './subtitle-data.service';
import { getFileList, getFileStats } from 'src/common/fs';
import { map, Observable, of } from 'rxjs';

@Injectable()
export class VideoCrawlerService implements OnModuleInit {
  videosPath: string;
  appStoragePath: string;
  constructor(
    configService: ConfigService,
    private subtitleDataService: SubtitleDataService,
    private dataService: DataService,
  ) {
    this.videosPath = configService.getOrThrow<string>(EnvConfig.videosPath);
    this.appStoragePath = configService.getOrThrow<string>(
      EnvConfig.storagePath,
    );
  }

  async onModuleInit() {
    await this.refresh();
  }

  public async refresh() {
    const videoFileNames = await getFileList(this.videosPath);
    for (const videoFileName of videoFileNames) {
      const ext = extname(videoFileName);
      if (ext !== '.mp4' && ext !== '.mkv') continue;
      this.dataService
        .findVideo(videoFileName)
        .pipe(
          map((existing) => {
            if (!existing) {
              return this.newVideo(videoFileName);
            } else {
              return this.updateVideo(existing);
            }
          }),
        )
        .subscribe();
    }
  }

  private addVideo(video: Video): Observable<Video | undefined> {
    return this.dataService.insertVideo(video);
  }

  private async newVideo(fileName: string) {
    const path = join(this.videosPath, fileName);
    const stats = await getFileStats(path);
    const baseName = basename(fileName, extname(fileName));

    const video: Video = {
      uuid: randomUUID(),
      baseName,
      path,
      fileName,
      friendlyName: baseName,
      description: '',
      mimeType: 'video/*',
      fileSize: stats.size,
      tags: [],
      subtitles: [],
    };

    video.subtitles = await this.subtitleDataService.getVideoSubtitles(video);

    this.addVideo(video);
  }

  private async updateVideo(
    existing: Video,
  ): Promise<Observable<Video | undefined>> {
    let dirty = false;
    const stats = await getFileStats(existing.path);
    if (stats.size !== existing.fileSize) {
      existing.fileSize = stats.size;
      dirty = true;
    }
    const subtitles =
      await this.subtitleDataService.getVideoSubtitles(existing);
    if (!subtitles.every((s) => existing.subtitles.includes(s))) {
      existing.subtitles = subtitles;
      dirty = true;
    }

    if (dirty) {
      return this.dataService.updateVideo(existing);
    } else {
      return of(existing);
    }
  }
}
