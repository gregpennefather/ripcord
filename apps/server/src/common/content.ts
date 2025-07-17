export const getContentRange = (
  start: number,
  end: number,
  fileSize: number,
): string => {
  return `bytes ${start}-${end}/${fileSize}`;
};
