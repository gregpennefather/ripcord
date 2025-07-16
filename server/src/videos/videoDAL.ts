import { existsSync, readdir, readFile, stat, Stats, writeFile } from "fs";
import { SubtitleFile, VideoFile as VideoFileInfo } from "./video";
import { basename, extname, join } from "path";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { Env } from "src/env";

@Injectable()
export class VideoDAL {
    private videosPath;
    constructor(config: ConfigService) {
        this.videosPath = config.get<Env>("VIDEOS_PATH");
    }

    videos: VideoFileInfo[] = [];
    lastRefresh?: number;
    refreshNeeded = () => !this.lastRefresh || Date.now() - this.lastRefresh > 60 * 1000;


    addVideo = async (fileName: string): Promise<void> => {
        if (!this.hasVideo(fileName)) {
            let videoFile = await this.buildVideoFileInfo(fileName);
            this.videos.push(videoFile);
        }

    }

    addVideoFileInfo = async (fileName: string): Promise<void> => {
        let videoFileInfo = await readInfoFile(this.videosPath, fileName);
        if (!this.hasVideo(videoFileInfo.fileName)) {
            this.videos.push(videoFileInfo);
        }
    }

    async getList(): Promise<VideoFileInfo[]> {
        if (this.refreshNeeded()) {
            await this.refresh();
        }
        return this.videos;
    }

    async info(uuid: string): Promise<VideoFileInfo | undefined> {
        if (this.refreshNeeded()) {
            await this.refresh();
        }
        return this.videos.find(v => v.uuid == uuid);
    }

    private async refresh(): Promise<void> {
        let files = await getFileList(this.videosPath);
        let infoFiles = files.filter(fName => extname(fName) == '.json');
        for (let infoFile of infoFiles) {
            await this.addVideoFileInfo(infoFile);
        }

        let videos = files.filter(isVideoFile);
        for (let videoFileName of videos) {
            await this.addVideo(videoFileName);
        }
    }

    private hasVideo(fileName): boolean {
        return this.videos.findIndex(v => v.fileName == fileName) !== -1;
    }

    private async buildVideoFileInfo(fileName: string): Promise<VideoFileInfo> {
        let baseName = basename(fileName, extname(fileName));
        let infoFilePath = join(this.videosPath, baseName + '.json');
        return new Promise<VideoFileInfo>(async (resolve, reject) => {
            let videoFilePath = join(this.videosPath, fileName);
            let stats = await getFileStats(videoFilePath);
            let subtitles = await getSubtitles(this.videosPath, baseName);
            let video: VideoFileInfo = {
                uuid: randomUUID(),
                fileName,
                friendlyName: basename(fileName, extname(fileName)),
                description: '',
                mimeType: 'video/*',
                fileSize: stats.size,
                tags: [],
                subtitles
            };
            writeFile(infoFilePath, JSON.stringify(video), (err) => err ? reject(err) : resolve(video));

        })
    }
}

const readInfoFile = async (videoPath: string, fileName: string): Promise<VideoFileInfo> => new Promise((resolve, reject) => {
    let path = join(videoPath, fileName);
    readFile(path, (err, data) => {
        if (err) reject(err);
        let info: VideoFileInfo = JSON.parse(data.toString())
        resolve(info);
    })
})

const getFileList = async (videoPath: string): Promise<string[]> => new Promise((resolve, reject) => {
    readdir(videoPath, (err, data) => {
        if (err) reject(err);
        resolve(data);
    })
})

const isVideoFile = (fileName): boolean => {
    let ext = extname(fileName);
    return ['.mkv', '.mp4'].indexOf(ext) >= 0;
}

const getFileStats = async (path: string): Promise<Stats> => new Promise((resolve, reject) => stat(path, (err, stats) => err ? reject(err) : resolve(stats)))

const getSubtitles = async (videoPath: string, baseName: string): Promise<SubtitleFile[]> => {
    return new Promise(async (resolve, reject) => {
        let reg = RegExp(`${baseName}(\.[a-z][a-z])(\.srt|\.vtt)`);
        readdir(videoPath, async (err, files) => {
            if (err) reject(err);

            let subFiles: SubtitleFile[] = [];
            await files
                .map(f => {
                    let regMatches = reg.exec(f)
                    if (regMatches?.length !== 3) {
                        return null;
                    } else {
                        return [f, regMatches[1].slice(1), regMatches[2].slice(1)]
                    }
                })
                .filter(matches => matches != null)
                .forEach(async ([fileName, locale, ext]) => {
                    if (ext === 'vtt') {
                        let vtt: SubtitleFile = {
                            lang: locale,
                            path: join(videoPath, `${fileName}`)
                        }
                        subFiles.push(vtt);
                    } else {
                        let vttPath = join(videoPath, `${baseName}.${locale}.vtt`);
                        if (!existsSync(vttPath)) {
                            let filePath = await createVtt(videoPath, fileName, baseName, locale);
                            let vtt: SubtitleFile = {
                                lang: locale,
                                path: filePath
                            }
                            return Promise.resolve(vtt);
                        }
                    }
                });
            resolve(subFiles);
        })
    })
}

async function createVtt(videoPath: string, fileName: string, baseName: string, locale: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        readFile(join(videoPath, fileName), (err, data) => {
            if (err) reject(err);
            let vttFilePath = join(videoPath, `${baseName}.${locale}.vtt`);
            let vttData = toVTT(data.toString());
            writeFile(vttFilePath, vttData, (err) => {
                if (err) reject(err);
                resolve(vttFilePath)
            })

        })
    })
}

function toVTT(input: string) {
    let output = 'WEBVTT\n\n';
    for (let line of input.split('\r\n')) {
        if (line.indexOf('-->') !== -1) {
            line = line.replaceAll(',', '.');
        }
        output += `${line}\r\n`
    }

    return output;
}