import { DownloadSimple, Share, Trash, X } from 'phosphor-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <div className={`${className} flex w-full items-center justify-between space-x-1 px-5 py-2`}>
      <div className={`flex items-center ${numberOfSelectedItems === 0 ? 'opacity-0' : ''}`}>
        <Icon Target={X} onClick={onUnselectClick} dataTest="photos-unselect-all" />
        <p style={{ paddingTop: '1px' }} className="ml-2 font-medium text-gray-80">
          {`${numberOfSelectedItems} ${
            numberOfSelectedItems > 1
              ? t('modals.deletePhotosModal.multiToolBar')
              : t('modals.deletePhotosModal.singleToolBar')
          }`}
        </p>
      </div>

      <div className="flex">
        <Icon Target={DownloadSimple} onClick={onDownloadClick} dataTest="photos-download-selected" />
        <Icon Target={Share} onClick={onShareClick} dataTest="photos-share-selected" />
        <Icon Target={Trash} onClick={onDeleteClick} dataTest="photos-delete-selected" />
      </div>
    </div>
  );
}

function Icon({
  Target,
  onClick,
  dataTest,
}: {
  Target: typeof DownloadSimple;
  onClick?: () => void;
  dataTest: string;
}) {
  return (
    <div
      className={`${
        onClick ? 'cursor-pointer text-gray-80 hover:bg-gray-5 active:bg-gray-10' : 'text-gray-40'
      } flex h-10 w-10 items-center justify-center rounded-lg `}
      onClick={onClick}
      data-test={dataTest}
    >
      <Target size={24} />
    </div>
  );
}
