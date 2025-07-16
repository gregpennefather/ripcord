import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream, stat } from 'fs';
import { join } from 'path';
import { VideoDAL } from './videoDAL';
import { VideoFile as VideoFileInfo } from './video';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/env';

// const VIDEOS_PATH = "/videos"

@Injectable()
export class VideosService {
  private videosPath;

  constructor(private dal: VideoDAL, config: ConfigService) {
    this.videosPath = config.get<Env>("VIDEOS_PATH");
  }

  public async getVideoStream(
    videoInfo: VideoFileInfo,
    range: string = 'bytes=0-',
  ): Promise<{
    streamableFile: StreamableFile;
    contentStart: number | undefined;
    contentEnd: number | undefined;
    fileSize: number;
    mimeType: string;

  }> {
    const filePath = join(
      this.videosPath,
      videoInfo.fileName,
    );

    let start: number | undefined;
    let end: number | undefined;

    if (range != 'bytes=0-') {
      const obj = parseRange(range, videoInfo.fileSize);
      start = obj.start;
      end = obj.end;
    }

    const stream = createReadStream(filePath, { start, end });
    return {
      streamableFile: new StreamableFile(stream, {
        disposition: `inline; filename="${videoInfo.fileName}"`,
        type: videoInfo.mimeType,
      }),
      contentStart: start,
      contentEnd: end,
      fileSize: videoInfo.fileSize,
      mimeType: videoInfo.mimeType
    };
  }

  public async fileList(): Promise<VideoFileInfo[]> {
    return this.dal.getList();
  }

  async getInfo(uuid: string): Promise<VideoFileInfo | undefined> {
    return this.dal.info(uuid);
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

  var index = str.indexOf('=');

  if (index === -1) {
    return { code: -2, ranges: [] };
  }

  // split the range string
  var arr = str.slice(index + 1).split(',');
  var rangeResult: RangeResult = { code: 0, ranges: [] };

  // parse all ranges
  for (var i = 0; i < arr.length; i++) {
    var range = arr[i].split('-');
    var start = parseInt(range[0], 10);
    var end = parseInt(range[1], 10);

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
