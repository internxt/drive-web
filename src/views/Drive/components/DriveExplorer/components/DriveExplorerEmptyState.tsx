import { MouseEvent } from 'react';
import { TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Empty } from '@internxt/ui';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { FavoritesEmptyState } from 'views/Favorites/components';

interface DriveExplorerEmptyStateProps {
  hasFilters: boolean;
  isTrash: boolean;
  isRecents: boolean;
  isFavorites: boolean;
  onUploadFileButtonClicked: () => void;
  onContextMenu: (event: MouseEvent) => void;
}

const FilesEmptyImage = () => {
  const FileIcon = iconService.getItemIcon(false);

  return (
    <div className="relative h-32 w-32">
      <FileIcon className="absolute -top-2.5 left-7 rotate-10 drop-shadow-soft" />
      <FileIcon className="absolute -left-7 top-0.5 -rotate-10 drop-shadow-soft" />
    </div>
  );
};

const EmptyTrashImage = () => (
  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gray-5">
    <TrashIcon size={80} weight="thin" />
  </div>
);

const DriveExplorerEmptyState = ({
  hasFilters,
  isTrash,
  isRecents,
  isFavorites,
  onUploadFileButtonClicked,
  onContextMenu,
}: DriveExplorerEmptyStateProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const uploadFilesAction = {
    icon: UploadSimpleIcon,
    style: 'elevated' as const,
    text: translate('views.recents.empty.uploadFiles'),
    onClick: onUploadFileButtonClicked,
  };

  if (hasFilters) {
    return (
      <Empty
        icon={<FilesEmptyImage />}
        title={translate('views.recents.empty.noResults')}
        subtitle={translate('views.recents.empty.dragNDrop')}
        action={uploadFilesAction}
      />
    );
  }

  if (isRecents) {
    return (
      <Empty
        icon={<FilesEmptyImage />}
        title={translate('views.recents.empty.title')}
        subtitle={translate('views.recents.empty.description')}
      />
    );
  }

  if (isFavorites) {
    return <FavoritesEmptyState />;
  }

  if (isTrash) {
    return (
      <Empty
        icon={<EmptyTrashImage />}
        title={translate('trash.empty-state.title')}
        subtitle={translate('trash.empty-state.subtitle')}
      />
    );
  }

  return (
    <Empty
      icon={<img className="w-36" alt="" src={folderEmptyImage} />}
      title={translate('views.recents.empty.folderEmpty')}
      subtitle={translate('views.recents.empty.folderEmptySubtitle')}
      action={uploadFilesAction}
      contextMenuClick={onContextMenu}
    />
  );
};

export default DriveExplorerEmptyState;
