import { MutableRefObject } from 'react';
import {
  ArrowFatUpIcon,
  FileArrowUpIcon,
  FolderSimplePlusIcon,
  TrashIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';
import { ContextMenu } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Point } from '../helpers/contextMenuPosition';

interface DriveExplorerContextMenuProps {
  isTrash: boolean;
  isFavorites: boolean;
  isRecents: boolean;
  isOpen: boolean;
  position: Point;
  menuRef: MutableRefObject<HTMLDivElement | null>;
  onClose: () => void;
  onCreateFolderButtonClicked: () => void;
  onUploadFileButtonClicked: () => void;
  onUploadFolderButtonClicked: () => void;
  onClearTrashButtonClicked: () => void;
}

const DriveExplorerContextMenu = ({
  isTrash,
  isFavorites,
  isRecents,
  isOpen,
  position,
  menuRef,
  onClose,
  onCreateFolderButtonClicked,
  onUploadFileButtonClicked,
  onUploadFolderButtonClicked,
  onClearTrashButtonClicked,
}: DriveExplorerContextMenuProps) => {
  const { translate } = useTranslationContext();

  if (!isOpen || isFavorites || isRecents) return null;

  const uploadMenu = [
    {
      node: (
        <button
          type="button"
          onClick={onCreateFolderButtonClicked}
          data-cy="contextMenuCreateFolderButton"
          className="flex w-full cursor-pointer items-center space-x-3 whitespace-nowrap bg-transparent p-0 text-left"
        >
          <FolderSimplePlusIcon size={20} />
          <p data-cy="contextMenuCreateFolderButtonText">{translate('actions.upload.folder')}</p>
          <span className="ml-5 flex grow items-center justify-end text-sm text-gray-40">
            <ArrowFatUpIcon size={14} /> F
          </span>
        </button>
      ),
    },
    {
      icon: FileArrowUpIcon,
      name: translate('actions.upload.uploadFiles'),
      action: onUploadFileButtonClicked,
    },
    {
      icon: UploadSimpleIcon,
      name: translate('actions.upload.uploadFolder'),
      action: onUploadFolderButtonClicked,
    },
  ];

  const trashMenu = [
    {
      icon: TrashIcon,
      name: translate('drive.clearTrash.accept'),
      action: onClearTrashButtonClicked,
    },
  ];

  return (
    <ContextMenu
      item="item"
      menuItemsRef={menuRef}
      openedFromRightClick
      posX={position.x}
      posY={position.y}
      isContextMenuCutOff={false}
      genericEnterKey={() => {}}
      handleMenuClose={onClose}
      isOpen={isOpen}
      menu={isTrash ? trashMenu : uploadMenu}
    />
  );
};

export default DriveExplorerContextMenu;
