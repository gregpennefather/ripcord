import { Injectable, Logger } from '@nestjs/common';
import { Video } from './video.model';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from 'src/env';
import { getFileList } from 'src/common/fs';
import { basename, extname, join } from 'path';
import { copyFile, existsSync, readFile, writeFile } from 'fs';
import { forkJoin, from, map, Observable, of, switchMap, zip } from 'rxjs';

interface BLE {
  full: string;
  base: string;
  lang: string;
  ext: string;
}

@Injectable()
export class SubtitleDataService {
  private readonly logger = new Logger(SubtitleDataService.name);

  videosPath: string;
  assetsPath: string;

  constructor(configService: ConfigService) {
    this.videosPath = configService.getOrThrow<string>(EnvConfig.videosPath);
    this.assetsPath = configService.getOrThrow<string>(EnvConfig.storagePath);
  }

  public getVideoSubtitles(video: Video): Observable<string[]> {
    const storageFiles = from(getFileListSplit(this.assetsPath, video.uuid));
    const videosFolderFiles = from(
      getFileListSplit(this.videosPath, video.baseName),
    );

    return forkJoin({ storageFiles, videosFolderFiles }).pipe(
      switchMap(({ storageFiles, videosFolderFiles }) =>
        this.migrateSubtitlesToStorage(
          storageFiles,
          videosFolderFiles,
          video.uuid,
        ),
      ),
    );
  }

  private migrateSubtitlesToStorage(
    storageFiles: BLE[],
    videoFiles: BLE[],
    videoFileUUID: string,
  ): Observable<string[]> {
    const files = videoFiles
      .filter((file) => file.ext == '.vtt' || file.ext == '.srt')
      .map((subFile) => {
        if (alreadyExists(storageFiles, videoFiles, videoFileUUID, subFile)) {
          return of(subFile.lang);
        }
        if (subFile.ext == '.vtt') {
          return from(
            this.copyVttFile(
              subFile.full,
              this.videosPath,
              join(
                this.assetsPath,
                `${videoFileUUID}.${subFile.lang}${subFile.ext}`,
              ),
            ),
          ).pipe(map(() => subFile.lang));
        } else {
          // SRT file does not have a storage VTT file so convert
          return from(
            this.convertToVttFile(subFile.full, subFile.lang, videoFileUUID),
          );
        }
      });

    if (files.length == 0) {
      return of([]);
    } else {
      return zip(files);
    }
  }

  async convertToVttFile(
    vttFileName: string,
    lang: string,
    videoUUID: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outPath = join(this.assetsPath, `${videoUUID}.${lang}.vtt`);
      if (!existsSync(outPath)) {
        this.logger.debug(`START: Convert '${vttFileName}' to .vtt`);
        readFile(join(this.videosPath, vttFileName), (err, data) => {
          if (err) reject(err);
          const vttData = toVTT(data.toString());
          writeFile(outPath, vttData, (err) => {
            if (err) reject(err);
            this.logger.debug(`FINISH: Convert '${vttFileName}' to .vtt`);
            resolve(lang);
          });
        });
      } else {
        resolve(lang);
      }
    });
  }

  async copyVttFile(
    fileName: string,
    fromDirectoryPath: string,
    toPath: string,
  ): Promise<string> {
    this.logger.debug(`START: Copy '${fileName}' to '${toPath}'`);
    return new Promise((resolve, reject) => {
      copyFile(join(fromDirectoryPath, fileName), toPath, (err) => {
        if (err) reject(err);
        this.logger.debug(`FINISH: Copy '${fileName}' to '${toPath}'`);
        resolve(toPath);
      });
    });
  }
}

function toVTT(input: string) {
  let output = 'WEBVTT\n\n';
  for (let line of input.split('\r\n')) {
    if (line.indexOf('-->') !== -1) {
      line = line.replaceAll(',', '.');
    }
    output += `${line}\r\n`;
  }

  return output;
}

const getFileListSplit = async (
  path: string,
  filter: string,
): Promise<BLE[]> => {
  return (await getFileList(path))
    .filter((f) => f.includes(filter))
    .map((full) => {
      const ext = extname(full);
      const base = basename(full, ext);
      const lang = extname(base).slice(1);
      return { full, base, lang, ext };
    });
};

function alreadyExists(
  storageFiles: BLE[],
  videoFiles: BLE[],
  videoFileUUID: string,
  subFile: BLE,
) {
  if (subFile.ext == '.vtt') {
    // If file is .vtt
    return storageFiles.findIndex((sf) => sf.full == subFile.full) !== -1; // check that it doesnt already exist
  } else if (subFile.ext == '.srt') {
    // If file is .srt
    const p = `${videoFileUUID}.${subFile.lang}.vtt`;
    if (videoFiles.findIndex((evf) => evf.full == p) !== -1) {
      // check if .vtt also exists in videos folder
      return storageFiles.findIndex((sf) => sf.full == p) !== -1; // if not, check there isn't a converted .vtt in storage
    } else {
      return false; // if .vtt exists in video folder skip .srt conversion
    }
  }
  throw new Error('Unexpected case');
}
