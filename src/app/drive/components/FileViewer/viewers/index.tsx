import { ComponentType, LazyExoticComponent, lazy } from 'react';
import { DriveFileData } from 'app/drive/types';
import { FileExtensionGroup } from 'app/drive/types/file-types';
import { getIsTypeAllowedAndFileExtensionGroupValues } from '../utils/fileViewerUtils';
import { FileContentViewerProps, ViewerContentSource } from './types';

export interface FileViewerEntry {
  Viewer: LazyExoticComponent<ComponentType<FileContentViewerProps>>;
  contentSource: ViewerContentSource;
}

const imageViewer: FileViewerEntry = {
  Viewer: lazy(() => import('./FileImageViewer/FileImageViewer')),
  contentSource: ViewerContentSource.Blob,
};

const pdfViewer: FileViewerEntry = {
  Viewer: lazy(() => import('./FilePdfViewer/FilePdfViewer')),
  contentSource: ViewerContentSource.Blob,
};

const videoViewer: FileViewerEntry = {
  Viewer: lazy(() => import('./FileVideoViewer/FileVideoViewer')),
  contentSource: ViewerContentSource.Stream,
};

const audioViewer: FileViewerEntry = {
  Viewer: lazy(() => import('./FileAudioViewer/FileAudioViewer')),
  contentSource: ViewerContentSource.Blob,
};

const spreadsheetViewer: FileViewerEntry = {
  Viewer: lazy(() => import('./FileXlsxViewer/FileXlsxViewer')),
  contentSource: ViewerContentSource.Blob,
};

const documentViewer: FileViewerEntry = {
  Viewer: lazy(() => import('./FileDocumentViewer/FileDocumentViewer')),
  contentSource: ViewerContentSource.Blob,
};

const textViewer: FileViewerEntry = {
  Viewer: lazy(() => import('./FileTxtViewer/FileTxtViewer')),
  contentSource: ViewerContentSource.Blob,
};

const viewersByExtensionGroup: Partial<Record<FileExtensionGroup, FileViewerEntry>> = {
  [FileExtensionGroup.Image]: imageViewer,
  [FileExtensionGroup.Pdf]: pdfViewer,
  [FileExtensionGroup.Video]: videoViewer,
  [FileExtensionGroup.Audio]: audioViewer,
  [FileExtensionGroup.Xls]: spreadsheetViewer,
  [FileExtensionGroup.Word]: documentViewer,
  [FileExtensionGroup.Txt]: textViewer,
  [FileExtensionGroup.Code]: textViewer,
  [FileExtensionGroup.Xml]: textViewer,
  [FileExtensionGroup.Csv]: textViewer,
};

export const getFileViewer = (file: Pick<DriveFileData, 'type'>): FileViewerEntry | undefined => {
  const extensionGroup = getIsTypeAllowedAndFileExtensionGroupValues(file);
  return extensionGroup ? viewersByExtensionGroup[extensionGroup.fileExtensionGroup] : undefined;
};
