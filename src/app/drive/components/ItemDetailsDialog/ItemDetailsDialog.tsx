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
import { DriveItemData, DriveItemDetails, ItemDetailsProps } from '../../../drive/types';
import newStorageService from 'app/drive/services/new-storage.service';
import errorService from 'app/core/services/error.service';
import { getItemPlainName } from 'app/crypto/services/utils';
import ItemDetailsSkeleton from './components/ItemDetailsSkeleton';
import { AdvancedSharedItem } from 'app/share/types';

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

const ItemsDetails = ({ item, translate }: { item: ItemDetailsProps; translate: (key: string) => string }) => {
  return (
    <>
      {Object.entries(item).map(([key, value]) => {
        if (!value) return;
        return (
          <div key={key} className="flex w-full max-w-xxxs flex-col items-start justify-center space-y-0.5">
            <p className="text-sm font-medium text-gray-50">
              {translate(`modals.itemDetailsModal.itemDetails.${key}`)}
            </p>
            <p title={value} className="line-clamp-2 w-full text-base font-medium text-gray-100">
              {value}
            </p>
          </div>
        );
      })}
    </>
  );
};

/**
 * Return all the details of the item selected
 * The data is:
 * - Name
 * - Shared
 * - Size (only for files)
 * - Type (only for files)
 * - Uploaded
 * - Modified
 * - Uploaded by
 * - Location
 *  */

const ItemDetailsDialog = ({
  onDetailsButtonClicked,
}: {
  onDetailsButtonClicked: (item: AdvancedSharedItem | DriveItemData) => void;
}) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isItemDetailsDialogOpen);
  const item = useAppSelector((state: RootState) => state.ui.itemDetails);
  const { translate } = useTranslationContext();
  const [itemProps, setItemProps] = useState<ItemDetailsProps>();
  const [isLoading, setIsLoading] = useState(false);
  const IconComponent = iconService.getItemIcon(item?.type === 'folder', item?.type);
  const itemName = `${item?.plainName ?? item?.name}` + `${item?.type && !item.isFolder ? '.' + item?.type : ''}`;
  const user = localStorageService.getUser();
  const isFolder = item?.isFolder;

  useEffect(() => {
    if (isOpen && item && user) {
      setIsLoading(true);
      const isShared = item.isShared ? translate('actions.yes') : translate('actions.no');
      const uploaded = formateDate(item.createdAt);
      const modified = formateDate(item.updatedAt);
      getDetailsData(item, isShared, uploaded, modified, user.email)
        .then((details) => {
          setItemProps(details);
          setIsLoading(false);
        })
        .catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
    }
  }, [item, isOpen]);

  const onClose = () => {
    dispatch(uiActions.setIsItemDetailsDialogOpen(false));
    setTimeout(() => {
      dispatch(uiActions.setItemDetailsItem(null));
      setItemProps(undefined);
    }, 300);
  };

  function formateDate(dateString: string) {
    return date.format(dateString, 'D MMMM, YYYY [at] HH:mm');
  }

  function handleButtonItemClick() {
    onDetailsButtonClicked(item as AdvancedSharedItem);
    onClose();
  }

  async function getDetailsData(
    item: DriveItemDetails,
    isShared: string,
    uploaded: string,
    modified: string,
    email: string,
  ) {
    const uuid = item.isFolder ? item.uuid : item.folderUuid;
    const rootPathName = item.view;

    const ancestors = await newStorageService.getFolderAncestors(uuid as string);

    const getPathName = ancestors.map((ancestor) => getItemPlainName(ancestor as unknown as DriveItemData)).reverse();

    if (item.isFolder) {
      getPathName.pop();
    }

    if (item.view === 'Drive') {
      getPathName.shift();
    }

    const path = '/' + rootPathName + (getPathName.length > 0 ? '/' + getPathName.join('/') : '');

    const details: ItemDetailsProps = {
      name: item.name,
      shared: isShared,
      type: item.isFolder ? undefined : item.type,
      size: item.isFolder ? undefined : bytesToString(item.size),
      uploaded: uploaded,
      modified: modified,
      uploadedBy: item.userEmail ?? email,
      location: path,
    };

    return details;
  }

  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose}>
      <div className="flex h-16 w-full items-center justify-between space-x-4 border-b border-gray-10 px-5">
        <Header title={translate('modals.itemDetailsModal.title')} onClose={onClose} />
      </div>
      <div className="flex w-full flex-col items-center justify-center space-y-6 px-5">
        <div className="flex w-full max-w-sm flex-col items-center justify-center space-y-3 py-5">
          <IconComponent width={60} height={80} />
          <p title={itemName} className="line-clamp-2 w-full flex-1 text-center text-base font-semibold text-gray-100">
            {itemName}
          </p>
          <Button onClick={handleButtonItemClick} variant="secondary">
            {item?.isFolder
              ? translate('modals.itemDetailsModal.folderCta')
              : translate('modals.itemDetailsModal.fileCta')}
          </Button>
        </div>
        <div className="flex w-full border border-gray-5" />

        <div className="grid-flow-cols grid w-full grid-cols-2 items-center justify-between gap-4 pb-10">
          {isLoading ? (
            <ItemDetailsSkeleton translate={translate} isFolder={isFolder} />
          ) : (
            <>{itemProps && <ItemsDetails item={itemProps} translate={translate} />}</>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ItemDetailsDialog;
