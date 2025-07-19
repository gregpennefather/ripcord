import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataService } from './data.service';
import { Video } from './video.model';
import { EnvConfig } from 'src/env';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { SubtitleDataService } from './subtitle-data.service';
import { getFileList, getFileStats } from 'src/common/fs';
import { forkJoin, from, map, Observable, of, switchMap, zip } from 'rxjs';
import { ThumbnailGenerationService } from './thumbnail-generation.service';

@Injectable()
export class VideoCrawlerService implements OnModuleInit {
  private readonly logger = new Logger(VideoCrawlerService.name);
  videosPath: string;
  appStoragePath: string;
  constructor(
    configService: ConfigService,
    private subtitleGenService: SubtitleDataService,
    private dataService: DataService,
    private thumbnailGeneration: ThumbnailGenerationService,
  ) {
    this.videosPath = configService.getOrThrow<string>(EnvConfig.videosPath);
    this.appStoragePath = configService.getOrThrow<string>(
      EnvConfig.storagePath,
    );
  }

  onModuleInit() {
    this.refresh().subscribe();
  }

  public refresh(): Observable<void> {
    const videoFileNames = from(getFileList(this.videosPath));

    const addOrUpdate = videoFileNames.pipe(
      map((vfn) => {
        return vfn.filter((fn) => {
          const ext = extname(fn);
          return ext === '.mp4' || ext === '.mkv';
        });
      }), // Filter out non-videos
      switchMap((fileNames) => {
        return zip(
          fileNames.map((fileName) =>
            this.dataService
              .findVideo({ fileName })
              .pipe(map((video) => ({ video, fileName }))),
          ),
        );
      }),
      switchMap((results) =>
        zip(
          results.map(({ video, fileName }) =>
            !video ? this.newVideo(fileName) : this.updateVideo(video),
          ),
        ),
      ),
    );

    return addOrUpdate.pipe(
      switchMap((videos) => this.thumbnailGeneration.generate(videos)),
    ); // Generate thumbs
  }

  private addVideo(video: Video): Observable<Video> {
    return this.dataService.insertVideo(video).pipe(
      map((r) => {
        if (!r) throw new Error('Could not add Video');
        return r;
      }),
    );
  }

  private newVideo(fileName: string) {
    this.logger.debug(`START: Adding new video ${fileName}`);

    const path = join(this.videosPath, fileName);
    const baseName = basename(fileName, extname(fileName));
    const stats = from(getFileStats(path));
    const mimeType = getMimeType(extname(fileName));

    const video: Video = {
      uuid: randomUUID(),
      baseName,
      path,
      fileName,
      friendlyName: baseName,
      description: '',
      mimeType,
      fileSize: 0,
      tags: [],
      subtitles: [],
    };

    const subtitles = from(this.subtitleGenService.getVideoSubtitles(video));

    return forkJoin({ stats, subtitles }).pipe(
      switchMap(({ stats, subtitles }) => {
        video.fileSize = stats.size;
        video.subtitles = subtitles;

        this.logger.debug(`FINISH: Adding new video ${fileName}`);

        return this.addVideo(video);
      }),
    );
  }

  private updateVideo(existing: Video): Observable<Video> {
    const stats = from(getFileStats(existing.path));
    const subtitles = this.subtitleGenService.getVideoSubtitles(existing);
    return forkJoin({ stats, subtitles })
      .pipe(
        switchMap(({ stats, subtitles }) => {
          let dirty = false;
          if (stats.size !== existing.fileSize) {
            existing.fileSize = stats.size;
            dirty = true;
          }
          if (!subtitles?.every((s) => existing.subtitles.includes(s))) {
            existing.subtitles = subtitles;
            dirty = true;
          }
          return dirty ? this.updateVideo(existing) : of(existing);
        }),
      )
      .pipe(
        map((r) => {
          if (!r) throw new Error('Could not add Video');
          return r;
        }),
      );
  }
}

function getMimeType(ext: string): string {
  const alpha = ext.slice(1);
  switch (alpha) {
    case 'mkv':
      return 'video/webm';
    default:
      return `video/${alpha}`;
  }
}
