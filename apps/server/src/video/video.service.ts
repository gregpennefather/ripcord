import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from 'src/env';
import { DataService } from 'src/data/data.service';
import { map, Observable } from 'rxjs';
import { Video } from 'src/data/video.model';

@Injectable()
export class VideosService {
  private videosPath;

  constructor(
    private dataService: DataService,
    config: ConfigService,
  ) {
    this.videosPath = config.get<EnvConfig>('VIDEOS_PATH');
  }

  public getVideoStream(
    videoUUID: string,
    range: string = 'bytes=0-',
  ): Observable<{
    streamableFile: StreamableFile;
    contentStart: number | undefined;
    contentEnd: number | undefined;
    fileSize: number;
    mimeType: string;
  }> {
    return this.dataService.findVideo({ uuid: videoUUID }).pipe(
      map(video => {
        if (!video) throw new NotFoundException(`Could not find video ${videoUUID}`);

        const filePath = join(this.videosPath, video.fileName);

        let start: number | undefined;
        let end: number | undefined;

        if (range != 'bytes=0-') {
          const obj = parseRange(range, video.fileSize);
          start = obj.start;
          end = obj.end;
        }

        const stream = createReadStream(filePath, { start, end });
        return {
          streamableFile: new StreamableFile(stream, {
            disposition: `inline; filename="${video.fileName}"`,
            type: video.mimeType,
          }),
          contentStart: start,
          contentEnd: end,
          fileSize: video.fileSize,
          mimeType: video.mimeType,
        };
      })
    )

  }

  public fileList(): Observable<Video[]> {
    return this.dataService.videos();
  }

  public getInfo(uuid: string): Observable<Video | null> {
    return this.dataService.findVideo({uuid});
  }
}

function parseRange(range: string, fileSize: number): Range {
  const parseResult = rangeParser(fileSize, range);
  if (
    parseResult.code === -1 ||
    parseResult.code === -2 ||
    parseResult.ranges.length !== 1
  ) {
    throw new BadRequestException('Could not parse requested content-range');
  }

  return parseResult.ranges[0];
}

interface RangeResult {
  code: number;
  ranges: Range[];
}
interface Range {
  start: number;
  end: number;
}

// https://github.com/jshttp/range-parser copying func to get around library issues
function rangeParser(size, str): RangeResult {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  const index = str.indexOf('=');

  if (index === -1) {
    return { code: -2, ranges: [] };
  }

  // split the range string
  const arr = str.slice(index + 1).split(',');
  const rangeResult: RangeResult = { code: 0, ranges: [] };

  // parse all ranges
  for (let i = 0; i < arr.length; i++) {
    const range = arr[i].split('-');
    let start = parseInt(range[0], 10);
    let end = parseInt(range[1], 10);

    // -nnn
    if (isNaN(start)) {
      start = size - end;
      end = size - 1;
      // nnn-
    } else if (isNaN(end)) {
      end = size - 1;
    }

    // limit last-byte-pos to current length
    if (end > size - 1) {
      end = size - 1;
    }

    // invalid or unsatisifiable
    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      continue;
    }

    // add range
    rangeResult.ranges.push({
      start: start,
      end: end,
    });
  }

  if (rangeResult.ranges.length < 1) {
    // unsatisifiable
    return { code: -1, ranges: [] };
  }

  return rangeResult;
}
