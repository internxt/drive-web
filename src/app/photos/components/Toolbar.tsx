import { HTMLAttributes } from 'react';
import { PlacesType } from 'react-tooltip';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DownloadSimple, Share, Trash, X } from '@phosphor-icons/react';
import TooltipElement from '../../shared/components/Tooltip/Tooltip';

const createToolTipsProps = (id: string, content: string, place: PlacesType): HTMLAttributes<HTMLElement> => ({
  'data-tooltip-id': id,
  'data-tooltip-content': content,
  'data-tooltip-place': place,
});

export default function Toolbar({
  className = '',
  onDeleteClick,
  onDownloadClick,
  onShareClick,
  onUnselectClick,
  numberOfSelectedItems,
}: {
  className?: string;
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onDeleteClick?: () => void;
  onUnselectClick?: () => void;
  numberOfSelectedItems: number;
}): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <div className={`${className} flex w-full items-center justify-between space-x-1 px-5 py-2`}>
      <div className={`flex items-center ${numberOfSelectedItems === 0 ? 'opacity-0' : ''}`}>
        <Icon Target={X} onClick={onUnselectClick} dataTest="photos-unselect-all" />
        <p style={{ paddingTop: '1px' }} className="ml-2 font-medium text-gray-80">
          {`${numberOfSelectedItems} ${
            numberOfSelectedItems > 1
              ? translate('modals.deletePhotosModal.multiToolBar')
              : translate('modals.deletePhotosModal.singleToolBar')
          }`}
        </p>
      </div>

      <div className="flex">
        <Icon
          Target={DownloadSimple}
          onClick={onDownloadClick}
          dataTest="photos-download-selected"
          toolTipProps={createToolTipsProps('photos-download-tooltip', translate('actions.download'), 'bottom')}
        />
        <TooltipElement id={'photos-download-tooltip'} />
        <Icon
          Target={Share}
          onClick={onShareClick}
          dataTest="photos-share-selected"
          toolTipProps={createToolTipsProps('photos-share-tooltip', translate('actions.share'), 'bottom')}
        />
        <TooltipElement id={'photos-share-tooltip'} />
        <Icon
          Target={Trash}
          onClick={onDeleteClick}
          dataTest="photos-delete-selected"
          toolTipProps={createToolTipsProps('photos-delete-tooltip', translate('actions.delete'), 'bottom')}
        />
        <TooltipElement id={'photos-delete-tooltip'} />
      </div>
    </div>
  );
}

function Icon({
  Target,
  onClick,
  dataTest,
  toolTipProps,
}: {
  Target: typeof DownloadSimple;
  onClick?: () => void;
  dataTest: string;
  toolTipProps?: HTMLAttributes<HTMLElement>;
}) {
  return (
    <div
      className={`${
        onClick ? 'cursor-pointer text-gray-80 hover:bg-gray-5 active:bg-gray-10' : 'text-gray-40'
      } flex h-10 w-10 items-center justify-center rounded-lg `}
      onClick={onClick}
      data-test={dataTest}
      {...toolTipProps}
    >
      <Target size={24} />
    </div>
  );
}
