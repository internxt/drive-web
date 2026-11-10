import { Button } from '@internxt/ui';
import { DownloadSimpleIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DownloadManager } from 'app/network/DownloadManager';
import TooltipElement, { DELAY_SHOW_MS } from 'components/TooltipElement';
import { HOTKEYS, useAppHotkey } from 'hooks';
import { PhotoSelection } from '../hooks/usePhotoSelection';
import { sortPhotosNewestFirst } from '../utils/photoTimeline';

interface PhotosSelectionHeaderProps {
  selectedPhotos: PhotoSelection;
  onClear: () => void;
  onMoveToTrash: () => void;
}

const PhotosSelectionHeader = ({ selectedPhotos, onClear, onMoveToTrash }: PhotosSelectionHeaderProps): JSX.Element => {
  const { translate } = useTranslationContext();
  useAppHotkey(HOTKEYS.close, onClear, { enableOnFormTags: ['input'] });

  const downloadSelection = () => {
    void DownloadManager.downloadItem({
      payload: sortPhotosNewestFirst([...selectedPhotos.values()]).flatMap(({ file, relatedFiles }) => [
        file,
        ...relatedFiles.map((related) => related.file),
      ]),
      selectedWorkspace: null,
      workspaceCredentials: null,
    });
  };

  return (
    <div
      role="toolbar"
      aria-label={translate('views.photos.selection.title')}
      className="flex grow items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={translate('views.photos.selection.clear')}
          onClick={onClear}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-80 hover:bg-gray-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <XIcon size={20} />
        </button>
        <span className="text-lg">{`${selectedPhotos.size} ${translate('contextMenu.itemsSelected')}`}</span>
      </div>
      <div className="flex items-center">
        <div
          className="flex items-center"
          data-tooltip-id="photos-download-tooltip"
          data-tooltip-content={translate('drive.dropdown.download')}
          data-tooltip-place="bottom"
        >
          <Button variant="ghost" className="aspect-square" onClick={downloadSelection}>
            <DownloadSimpleIcon className="h-6 w-6" />
            <span className="sr-only">{translate('drive.dropdown.download')}</span>
          </Button>
          <TooltipElement id="photos-download-tooltip" delayShow={DELAY_SHOW_MS} />
        </div>
        <div
          className="flex items-center"
          data-tooltip-id="photos-trash-tooltip"
          data-tooltip-content={translate('drive.dropdown.moveToTrash')}
          data-tooltip-place="bottom"
        >
          <Button variant="ghost" className="aspect-square" onClick={onMoveToTrash}>
            <TrashIcon className="h-6 w-6" />
            <span className="sr-only">{translate('drive.dropdown.moveToTrash')}</span>
          </Button>
          <TooltipElement id="photos-trash-tooltip" delayShow={DELAY_SHOW_MS} />
        </div>
      </div>
    </div>
  );
};

export default PhotosSelectionHeader;
