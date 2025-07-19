import { existsSync, mkdir, readdir, stat, Stats } from 'fs';

export const getFileList = async (path: string): Promise<string[]> => {
  if (!existsSync(path)) {
    await mkFolders(path);
  }
  return new Promise((resolve, reject) => {
    readdir(path, (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });
};
export const getFileStats = async (path: string): Promise<Stats> =>
  new Promise((resolve, reject) =>
    stat(path, (err, stats) => (err ? reject(err) : resolve(stats))),
  );

export const mkFolders = (path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    mkdir(path, { recursive: true }, async (err, path) => {
      if (err) reject(err);
      if (path) await mkFolders(path);
      resolve();
    });
  });
};
