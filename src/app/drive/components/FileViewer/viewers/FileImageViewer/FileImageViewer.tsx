import { Loader } from '@internxt/ui';

import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { FileContentViewerProps } from '../types';
import { PORTRAIT_VIEWER_PADDING_CLASS } from '../../utils/fileViewerUtils';
import { useDisplayableImage } from './useDisplayableImage';

import './FileImageViewer.scss';

const FileImageViewer = ({
  file,
  blob,
  onError,
  onProgress,
  onConvertedContent,
}: FileContentViewerProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const extension = file.type ? String(file.type).toLowerCase() : '';
  const { fileUrl, isConverting } = useDisplayableImage({
    file,
    blob,
    extension,
    onError,
    onProgress,
    onConvertedContent,
  });

  const shouldShowConversionLoader = isConverting && !onProgress;

  return (
    <div
      className={`flex max-h-screen max-w-full flex-col items-center justify-center text-white ${PORTRAIT_VIEWER_PADDING_CLASS}`}
    >
      <div className="relative max-h-screen max-w-full">
        {shouldShowConversionLoader && (
          <div className="flex flex-col items-center space-y-4 p-8" data-testid="image-conversion-loader">
            <Loader classNameLoader="h-8 w-8" />
            <span className="text-white/50">{translate('drive.loadingFile')}</span>
          </div>
        )}
        {fileUrl && (
          <img
            src={fileUrl}
            alt={file.name}
            className="relative max-h-screen object-contain portrait:max-w-full"
            draggable={false}
            onError={onError}
          />
        )}
      </div>
    </div>
  );
};

export default FileImageViewer;
