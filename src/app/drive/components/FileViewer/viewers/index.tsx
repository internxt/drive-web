import { FileExtensionGroup } from '../../../types/file-types';
import FileImageViewer from './FileImageViewer/FileImageViewer';
import FilePdfViewer from './FilePdfViewer/FilePdfViewer';

export default {
  [FileExtensionGroup.Image]: FileImageViewer,
  [FileExtensionGroup.Pdf]: FilePdfViewer,
};
