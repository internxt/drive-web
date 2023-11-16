import { useEffect, useState } from 'react';

import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import Modal from '../../../shared/components/Modal';
import { X } from '@phosphor-icons/react';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import iconService from '../../../drive/services/icon.service';
import Button from '../../../shared/components/Button/Button';
import { bytesToString } from '../../../drive/services/size.service';
import date from '../../../core/services/date.service';
import localStorageService from '../../../core/services/local-storage.service';
import useDriveItemActions from '../DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';
import { DriveItemData } from '../../../drive/types';

interface itemProps {
  name: string;
  uploadedBy?: string;
  location: string;
  uploaded: string;
  modified: string;
  shared: number;
  type?: string;
  size?: string;
}

const Header = ({ title, onClose }: { title: string; onClose: () => void }) => {
  return (
    <>
      <span
        className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-xl font-medium"
        title={title}
      >
        {title}
      </span>
      <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black bg-opacity-0 transition-all duration-200 ease-in-out hover:bg-opacity-4 active:bg-opacity-8">
        <X onClick={onClose} size={22} />
      </div>
    </>
  );
};

const ItemDetailsDialog = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isItemDetailsDialogOpen);
  const item = useAppSelector((state: RootState) => state.ui.itemDetails);
  const { translate } = useTranslationContext();
  const [itemProps, setItemProps] = useState<itemProps>();
  const IconComponent = iconService.getItemIcon(item?.type === 'folder', item?.type);
  const itemName = `${item?.plainName ?? item?.name}` + `${item?.type ? '.' + item?.type : ''}`;
  const user = localStorageService.getUser();
  const { onItemDoubleClicked } = useDriveItemActions(item as DriveItemData);

  useEffect(() => {
    if (isOpen && item && user) {
      setItemProps({
        name: item.name,
        shared: item?.shares!.length > 0 ? item?.shares!.length : 0,
        type: item.type,
        size: bytesToString(item.size),
        uploaded: formateDate(item.createdAt),
        modified: formateDate(item.updatedAt),
        uploadedBy: user.email,
        location: 'Drive',
      });
    }
  }, [item, isOpen]);

  function onClose() {
    dispatch(uiActions.setIsItemDetailsDialogOpen(false));
    setTimeout(() => {
      dispatch(uiActions.setItemDetailsItem(null));
    }, 300);
  }

  function handleButtonItemClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    if (!item?.isFolder) {
      onClose();
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(item));
    } else {
      onItemDoubleClicked(event);
    }
  }

  function formateDate(dateString: string) {
    return date.format(dateString, 'D MMMM, YYYY [at] HH:mm');
  }

  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose}>
      <div className="flex h-16 w-full items-center justify-between space-x-4 border-b border-gray-10 px-5">
        <Header title={translate('modals.itemDetailsModal.title')} onClose={onClose} />
      </div>
      <div className="flex w-full flex-col items-center justify-center space-y-6 px-5">
        <div className="flex flex-col">
          <div className="flex flex-col items-center justify-center space-y-3 py-5">
            <IconComponent width={60} height={80} />
            <p>{itemName}</p>
            <Button onClick={handleButtonItemClick} variant="secondary">
              {translate('modals.itemDetailsModal.fileCta')}
            </Button>
          </div>
        </div>
        <div className="flex w-full border border-gray-5" />
        <div className="grid-flow-cols grid w-full grid-cols-2 items-center justify-between gap-4 truncate pb-10">
          {itemProps &&
            Object.keys(itemProps).map((key) => {
              return (
                <div
                  key={key}
                  className="flex w-full max-w-xxxs flex-col items-start justify-center space-y-0.5 truncate"
                >
                  <p className="text-sm font-medium text-gray-50">
                    {translate(`modals.itemDetailsModal.itemDetails.${key}`)}
                  </p>
                  <p className="truncate text-base font-medium text-gray-100">{itemProps[key]}</p>
                </div>
              );
            })}
        </div>
      </div>
    </Modal>
  );
};

export default ItemDetailsDialog;
