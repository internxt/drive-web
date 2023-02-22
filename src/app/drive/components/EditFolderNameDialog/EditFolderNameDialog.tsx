import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import i18n from 'app/i18n/services/i18n.service';
import Button from 'app/shared/components/Button/Button';
import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import { DriveItemData } from '../../types';
import { DriveFolderMetadataPayload } from 'app/drive/types/index';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useSelector } from 'react-redux';
import { storageActions } from 'app/store/slices/storage';

const EditFolderNameDialog = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const itemToRename = useSelector((state: RootState) => state.storage.itemToRename);
  const allItems = useAppSelector((state) => state.storage.levels);
  const namePath = useAppSelector((state) => state.storage.namePath);
  const currentBreadcrumb = namePath.slice(-1);

  const [itemName, setItemName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isEditFolderNameDialog);

  const findCurrentFolder = (currentBreadcrumb) => {
    const foldersList: DriveItemData[] = [];

    for (const itemsInAllItems in allItems) {
      const selectedFolder = allItems[itemsInAllItems].find((item) => item.id === currentBreadcrumb[0].id);
      if (selectedFolder) foldersList.push(selectedFolder);
    }
    return foldersList;
  };

  const currentItem = itemToRename ? itemToRename : findCurrentFolder(currentBreadcrumb);

  useEffect(() => {
    setItemName(itemToRename ? itemToRename?.name : currentBreadcrumb[0]?.name);
  }, [namePath, itemToRename]);

  const onClose = (): void => {
    setIsLoading(false);
    dispatch(storageActions.setItemToRename(null));
    dispatch(uiActions.setIsEditFolderNameDialog(false));
  };

  const renameItem = async () => {
    const item = currentItem[0]?.isFolder ? currentItem[0] : currentItem;
    const metadata: DriveFolderMetadataPayload = { itemName: itemName };

    if (itemName === item?.name) {
      onClose();
    } else if (itemName && itemName.trim().length > 0) {
      setIsLoading(true);
      await dispatch(storageThunks.updateItemMetadataThunk({ item, metadata }))
        .unwrap()
        .then(() => {
          setIsLoading(false);
          dispatch(
            itemToRename
              ? uiActions.setCurrentEditingNameDirty(itemName)
              : uiActions.setCurrentEditingBreadcrumbNameDirty(itemName),
          );
          onClose();
        })
        .catch((e) => {
          const errorMessage = e?.message?.includes('already exists') && translate('error.creatingFolder');
          setError(errorMessage);
          setIsLoading(false);
          return e;
        });
    } else {
      setError(translate('error.folderCannotBeEmpty'));
    }
  };

  const onRenameButtonClicked = (e) => {
    e.preventDefault();
    if (!isLoading) {
      setError('');
      renameItem();
    }
  };

  return (
    <Modal maxWidth="max-w-sm" isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col space-y-5" onSubmit={(e) => onRenameButtonClicked(e)}>
        <p className="text-2xl font-medium text-gray-100">{translate('modals.renameItemDialog.title')}</p>

        <Input
          disabled={isLoading}
          className={`${error !== '' ? 'error' : ''}`}
          label={translate('modals.renameItemDialog.label')}
          value={itemName}
          placeholder={itemName}
          onChange={(name) => {
            setItemName(name);
            setError('');
          }}
          accent={error ? 'error' : undefined}
          message={error}
          autofocus
        />

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} variant="primary">
            {translate('actions.rename')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditFolderNameDialog;
