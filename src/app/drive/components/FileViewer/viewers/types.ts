import { PreviewFileItem } from 'app/share/types';

export enum ViewerContentSource {
  Blob = 'blob',
  Stream = 'stream',
}

export interface FileContentViewerProps {
  file: PreviewFileItem;
  blob: Blob | null;
  disableVideoStream?: boolean;
  onError: () => void;
  onProgress?: (progress: number) => void;
  onConvertedContent?: (file: PreviewFileItem, content: Blob) => Promise<void>;
}
