import iconService from 'app/drive/services/icon.service';
import { DriveFileData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { getFileDisplayName } from '../utils/fileViewerUtils';

const LOADED_PROGRESS = 1;

interface FilePreviewLoadingProps {
  file: DriveFileData;
  progress?: number;
  hasContent: boolean;
}

const FilePreviewLoading = ({ file, progress, hasContent }: FilePreviewLoadingProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const ItemIconComponent = iconService.getItemIcon(false, file.type);
  const filename = getFileDisplayName(file);
  const isLoaded = progress === LOADED_PROGRESS || (progress === 0 && hasContent);
  const progressPercentage = progress ? progress * 100 : 0;

  return (
    <div
      className={`${isLoaded ? 'hidden' : 'flex'} pointer-events-none z-10 select-none flex-col items-center justify-center rounded-xl font-medium outline-none`}
    >
      <div className="flex h-20 w-20 items-center">
        <ItemIconComponent width={80} height={80} />
      </div>
      <span className="w-96 truncate pt-4 text-center text-lg" title={filename}>
        {filename}
      </span>
      <span className="text-white/50">{translate('drive.loadingFile')}</span>
      <div className="mt-8 h-1.5 w-56 rounded-full bg-white/25">
        <div className="h-1.5 rounded-full bg-white" style={{ width: `${progressPercentage}%` }} />
      </div>
    </div>
  );
};

export default FilePreviewLoading;
