import { Injectable } from '@nestjs/common';
import { Video } from './video.model';
import { ConfigService } from '@nestjs/config';
import { DataService } from './data.service';
import { EnvConfig } from 'src/env';
import { getFileList } from 'src/common/fs';
import { basename, extname, join } from 'path';
import { copyFile, existsSync, readFile, writeFile } from 'fs';

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

  public async getVideoSubtitles(video: Video): Promise<string[]> {
    const storageFiles = await getFileListSplit(
      this.appStoragePath,
      video.uuid,
    );
    const videosFolderFiles = await getFileListSplit(
      this.videosPath,
      video.baseName,
    );
    await this.migrateSubtitlesToStorage(
      storageFiles,
      videosFolderFiles,
      video.uuid,
    );

    const langs = (await getFileListSplit(this.appStoragePath, video.uuid))
      .filter(({ ext }) => ext === '.vtt')
      .map(({ lang }) => lang);
    return langs;
  }

  private async migrateSubtitlesToStorage(
    storageFiles: BLE[],
    videoFiles: BLE[],
    videoFileUUID: string,
  ) {
    for (const videoFile of videoFiles) {
      if (storageFiles.findIndex(({ lang }) => lang == videoFile.lang) === -1) {
        if (videoFile.ext == '.vtt') {
          await copyVttFile(
            join(this.videosPath, videoFile.full),
            join(
              this.appStoragePath,
              `${videoFileUUID}.${videoFile.lang}${videoFile.ext}`,
            ),
          );
        } else if (videoFile.ext == '.srt') {
          // SRT file does not have a storage VTT file so convert
          await this.convertToVttFile(
            videoFile.full,
            videoFile.lang,
            videoFileUUID,
          );
        }
      }
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
