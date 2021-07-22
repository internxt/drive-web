export interface File {
  name: string,
  lasModified: number,
  lastModifiedDate: Date,
  webkitRelativePath: string,
  size: number,
  type: string
}

interface IGetFilenameAndExt {
  filename: string,
  extension: string
}

/**
 * Separates entire filename in filename and extension
 * @param entireFilename Filename + extension
 * @returns Filename and extension splitted
 */
export function getFilenameAndExtension(entireFilename: string): IGetFilenameAndExt {
  // based on path.parse native nodejs function
  const re = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

  const fileInfo = re.exec(entireFilename);

  if (!fileInfo) {
    return { filename: '', extension: '' };
  }

  const extensionWithDot = fileInfo[4];
  const filename = fileInfo[3].substring(0, fileInfo[3].length - extensionWithDot.length);

  const extension = extensionWithDot.split('.')[1];

  return { filename, extension };
}

export function resolveNameConflicts(fileList: Array<File>) {
  // TODO
}