import { FileExtensionGroup } from 'app/drive/types/file-types';
import { lazy } from 'react';
const FileImageViewer = lazy(() => import('./FileImageViewer/FileImageViewer'));
const FilePdfViewer = lazy(() => import('./FilePdfViewer/FilePdfViewer'));
const FileVideoViewer = lazy(() => import('./FileVideoViewer/FileVideoViewer'));
const FileAudioViewer = lazy(() => import('./FileAudioViewer/FileAudioViewer'));
const FileXlsxViewer = lazy(() => import('./FileXlsxViewer/FileXlsxViewer'));
const FileDocumentViewer = lazy(() => import('./FileDocumentViewer/FileDocumentViewer'));
const FileTxtViewer = lazy(() => import('./FileTxtViewer/FileTxtViewer'));

export default {
  [FileExtensionGroup.Image]: FileImageViewer,
  [FileExtensionGroup.Pdf]: FilePdfViewer,
  [FileExtensionGroup.Video]: FileVideoViewer,
  [FileExtensionGroup.Audio]: FileAudioViewer,
  [FileExtensionGroup.Xls]: FileXlsxViewer,
  [FileExtensionGroup.Word]: FileDocumentViewer,
  [FileExtensionGroup.Txt]: FileTxtViewer,
  [FileExtensionGroup.Code]: FileTxtViewer,
  [FileExtensionGroup.Xml]: FileTxtViewer,
  [FileExtensionGroup.Csv]: FileTxtViewer,
};
