import { Injectable } from "@nestjs/common";
import { Video } from "./video.model";
import { existsSync } from "fs";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import * as ffmpeg from 'fluent-ffmpeg';
import { forkJoin, from, map, Observable, zip } from "rxjs";
import { EnvConfig } from "src/env";

@Injectable()
export class ThumbnailGenerationService {
    videosPath: string;
    storagePath: string;
    constructor(configService: ConfigService) {
        this.videosPath = configService.getOrThrow<string>(EnvConfig.videosPath);
        this.storagePath = configService.getOrThrow<string>(
            EnvConfig.storagePath,
        );
    }

    generate(videos: Video[]): Observable<void> {
        let obvs = videos.map(video => from(this.generateThumbnail(video)));
        return forkJoin(obvs).pipe(map(() => {}));
    }


    private generateThumbnail(video: Video): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                let thumbFileName = `${video.uuid}.png`;
                if (!existsSync(join(this.storagePath, thumbFileName))) {
                    let r = new ffmpeg(video.path).takeScreenshots({
                        count: 1,
                        timestamp: '5%',
                        filename: thumbFileName,
                        folder: this.storagePath,
                        size: '720x405'
                    }).on('end', () => {
                        resolve();
                    })
                } else {
                    resolve()
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}
