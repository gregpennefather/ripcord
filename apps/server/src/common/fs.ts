import { readdir, stat, Stats } from 'fs';

export const getFileList = async (path: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    readdir(path, (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });

export const getFileStats = async (path: string): Promise<Stats> =>
  new Promise((resolve, reject) =>
    stat(path, (err, stats) => (err ? reject(err) : resolve(stats))),
  );
