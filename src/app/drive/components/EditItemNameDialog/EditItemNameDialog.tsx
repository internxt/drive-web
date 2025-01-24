import { Button } from '@internxt/ui';
import { DriveFolderMetadataPayload } from 'app/drive/types/index';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import { useAppDispatch } from 'app/store/hooks';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { FC, useEffect, useState } from 'react';
import { DriveItemData } from '../../types';

type EditItemNameDialogProps = {
  item: DriveItemData | undefined;
  isOpen: boolean;
  resourceToken?: string;
  onClose?: (newItem?: DriveItemData) => void;
  onSuccess?: () => void;
};

const EditItemNameDialog: FC<EditItemNameDialogProps> = ({ item, isOpen, resourceToken, onClose, onSuccess }) => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const itemName = item?.plainName ?? '';

  useEffect(() => {
    setNewItemName(itemName);
  }, [item]);

  const handleOnClose = (newName = ''): void => {
    setIsLoading(false);
    const newItem = newName.length > 0 ? ({ ...item, plainName: newName } as DriveItemData) : undefined;
    onClose?.(newItem);
  };

  const renameItem = async () => {
    const metadata: DriveFolderMetadataPayload = { itemName: newItemName };

    if (newItemName === item?.name) {
      handleOnClose();
    } else if (item && newItemName && newItemName.trim().length > 0) {
      setIsLoading(true);
      await dispatch(storageThunks.updateItemMetadataThunk({ item, metadata, resourceToken }))
        .unwrap()
        .then(() => {
          setIsLoading(false);
          handleOnClose(newItemName);
          onSuccess?.();
        })
        .catch((e) => {
          let errorMessage = e?.message?.includes('already exists') && translate('error.creatingFolder');
          if (!errorMessage) {
            errorMessage = translate('error.changingName');
          }
          setError(errorMessage);
          setIsLoading(false);
        });
    } else {
      setError(item?.isFolder ? translate('error.folderCannotBeEmpty') : translate('error.fileCannotBeEmpty'));
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
    <Modal maxWidth="max-w-sm" isOpen={isOpen} onClose={handleOnClose}>
      <form className="flex flex-col space-y-5" data-cy="editItemNameDialog" onSubmit={onRenameButtonClicked}>
        <p className="text-2xl font-medium text-gray-100" data-cy="editItemNameDialogTitle">
          {translate('modals.renameItemDialog.title')}
        </p>
        <Input
          disabled={isLoading}
          className={`${error !== '' ? 'error' : ''}`}
          labelDataCy="editItemNameDialogInputTitle"
          inputDataCy="editItemNameDialogInput"
          label={translate('modals.renameItemDialog.label')}
          value={newItemName}
          placeholder={newItemName}
          onChange={(name) => {
            setNewItemName(name);
            setError('');
          }}
          accent={error ? 'error' : undefined}
          message={error}
          autofocus
        />
        <div className="flex flex-row items-center justify-end space-x-2">
          <Button
            disabled={isLoading}
            variant="secondary"
            onClick={() => handleOnClose()}
            buttonDataCy="editItemNameDialogCancelButton"
            buttonChildrenDataCy="editItemNameDialogCancelButtonText"
          >
            {translate('actions.cancel')}
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            variant="primary"
            buttonDataCy="editItemNameDialogAcceptButton"
            buttonChildrenDataCy="editItemNameDialogAcceptButtonText"
          >
            {translate('actions.rename')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditItemNameDialog;
