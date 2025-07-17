import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataService } from './data.service';
import { Video } from './video.model';
import { EnvConfig } from 'src/env';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { SubtitleDataService } from './subtitle-data.service';
import { getFileList, getFileStats } from 'src/common/fs';
import { combineAll, combineLatestAll, combineLatestWith, concatAll, concatMap, exhaustAll, exhaustMap, filter, flatMap, forkJoin, from, map, merge, mergeAll, mergeMap, Observable, of, switchMap, tap, zip } from 'rxjs';
import { ThumbnailGenerationService } from './thumbnail-generation.service';

@Injectable()
export class VideoCrawlerService implements OnModuleInit {
  videosPath: string;
  appStoragePath: string;
  constructor(
    configService: ConfigService,
    private subtitleGenService: SubtitleDataService,
    private dataService: DataService,
    private thumbnailGeneration: ThumbnailGenerationService
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

    let addOrUpdate = videoFileNames.pipe(
      map(vfn => {
        return vfn.filter(fn => {
          let ext = extname(fn);
          return ext === '.mp4' || ext === '.mkv';
        })
      }), // Filter out non-videos
      switchMap(fileNames => {
        return zip(fileNames.map(fileName => this.dataService.findVideo({ fileName }).pipe(map(video => ({ video, fileName })))));
      }),
      switchMap((results) => zip(results.map(({ video, fileName }) => !video ? this.newVideo(fileName) : this.updateVideo(video))))
    );

    return addOrUpdate.pipe(switchMap(videos => this.thumbnailGeneration.generate(videos))); // Generate thumbs

  }

  private addVideo(video: Video): Observable<Video> {
    return this.dataService.insertVideo(video).pipe(map(r => {
      if (!r) throw new Error("Could not add Video");
      return r;
    }))
  }

  private newVideo(fileName: string) {
    const path = join(this.videosPath, fileName);
    const baseName = basename(fileName, extname(fileName));
    const stats = from(getFileStats(path));

    let video: Video = {
      uuid: randomUUID(),
      baseName,
      path,
      fileName,
      friendlyName: baseName,
      description: '',
      mimeType: 'video/*',
      fileSize: 0,
      tags: [],
      subtitles: [],
    }

    let subtitles = from(this.subtitleGenService.getVideoSubtitles(video));

    return forkJoin({ stats, subtitles }).pipe(switchMap(({ stats, subtitles }) => {
      video.fileSize = stats.size;
      video.subtitles = subtitles;

      return this.addVideo(video)
    }));
  }

  private updateVideo(
    existing: Video,
  ): Observable<Video> {
    let stats = from(getFileStats(existing.path));
    let subtitles = this.subtitleGenService.getVideoSubtitles(existing);
    return forkJoin({ stats, subtitles }).pipe(switchMap(({ stats, subtitles }) => {
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
    })).pipe(map(r => {
      if (!r) throw new Error("Could not add Video");
      return r;
    }))
  }
}
