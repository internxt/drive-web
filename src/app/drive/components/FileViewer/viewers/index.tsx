import { FileExtensionGroup } from '../../../types/file-types';
import { lazy } from 'react';
const FileImageViewer = lazy(() => import('./FileImageViewer/FileImageViewer'));
const FilePdfViewer = lazy(() => import('./FilePdfViewer/FilePdfViewer'));

export default {
  [FileExtensionGroup.Image]: FileImageViewer,
  [FileExtensionGroup.Pdf]: FilePdfViewer,
};
