import { Injectable } from '@nestjs/common';
import { Video } from './video.model';
import { ConfigService } from '@nestjs/config';
import { DataService } from './data.service';
import { EnvConfig } from 'src/env';
import { getFileList } from 'src/common/fs';
import { basename, extname, join } from 'path';
import { copyFile, existsSync, readFile, writeFile } from 'fs';
import { concatAll, forkJoin, from, map, Observable, of, switchMap, zip } from 'rxjs';

interface BLE {
  full: string;
  base: string;
  lang: string;
  ext: string;
}

@Injectable()
export class SubtitleDataService {
  videosPath: string;
  appStoragePath: string;

  constructor(
    configService: ConfigService,
    private dataService: DataService,
  ) {
    this.videosPath = configService.getOrThrow<string>(EnvConfig.videosPath);
    this.appStoragePath = configService.getOrThrow<string>(
      EnvConfig.storagePath,
    );
  }

  public getVideoSubtitles(video: Video): Observable<string[]> {
    const storageFiles = from(getFileListSplit(
      this.appStoragePath,
      video.uuid,
    ));
    const videosFolderFiles = from(getFileListSplit(
      this.videosPath,
      video.baseName,
    ));

    return forkJoin({ storageFiles, videosFolderFiles })
      .pipe(
        switchMap(({ storageFiles, videosFolderFiles }) => this.migrateSubtitlesToStorage(storageFiles, videosFolderFiles, video.uuid)));
  }

  private migrateSubtitlesToStorage(
    storageFiles: BLE[],
    videoFiles: BLE[],
    videoFileUUID: string,
  ): Observable<string[]> {
    let files = videoFiles.filter(vf => {
      if (vf.ext == '.vtt') { // If file is .vtt
        return storageFiles.findIndex(sf => sf.full == vf.full) === -1; // check that it doesnt already exist
      } else if (vf.ext == '.srt') { // If file is .srt
        let p = `${videoFileUUID}.${vf.lang}.vtt`;
        if (videoFiles.findIndex(evf => evf.full == p) === -1) { // check if .vtt also exists in videos folder
          return storageFiles.findIndex(sf => sf.full == p) === -1; // if not, check there isn't a converted .vtt in storage
        } else {
          return false; // if .vtt exists in video folder skip .srt conversion
        }
      }
      return false;
    }).map(videoFile => {
      if (videoFile.ext == '.vtt') {
        return from(copyVttFile(
          join(this.videosPath, videoFile.full),
          join(
            this.appStoragePath,
            `${videoFileUUID}.${videoFile.lang}${videoFile.ext}`,
          ),
        )).pipe(map(() => videoFile.lang))
      } else {
        // SRT file does not have a storage VTT file so convert
        return from(this.convertToVttFile(
          videoFile.full,
          videoFile.lang,
          videoFileUUID,
        ))
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
      const outPath = join(this.appStoragePath, `${videoUUID}.${lang}.vtt`);
      if (!existsSync(outPath)) {
        readFile(join(this.videosPath, vttFileName), (err, data) => {
          if (err) reject(err);
          const vttData = toVTT(data.toString());
          writeFile(outPath, vttData, (err) => {
            if (err) reject(err);
            resolve(lang);
          });
        });
      } else {
        resolve(lang);
      }
    });
  }
}

async function copyVttFile(from: string, to: string): Promise<string> {
  return new Promise((resolve, reject) => {
    copyFile(from, to, (err) => {
      if (err) reject(err);
      resolve(to);
    });
  });
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
