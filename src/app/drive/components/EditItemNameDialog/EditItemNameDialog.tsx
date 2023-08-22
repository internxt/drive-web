import { FC, useEffect, useState } from 'react';
import { useAppDispatch } from 'app/store/hooks';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import Button from 'app/shared/components/Button/Button';
import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import { DriveItemData } from '../../types';
import { DriveFolderMetadataPayload } from 'app/drive/types/index';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

type EditItemNameDialogProps = {
  item: DriveItemData;
  resourceToken?: string;
  onClose?: () => void;
};

const EditItemNameDialog: FC<EditItemNameDialogProps> = ({ item, resourceToken, onClose }) => {
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();

  useEffect(() => {
    setTimeout(() => {
      setNewItemName(item.name);
    }, 0);
  }, [item]);

  const handleOnClose = (): void => {
    setIsLoading(false);
    onClose?.();
  };

  const renameItem = async () => {
    const metadata: DriveFolderMetadataPayload = { itemName: newItemName };

    if (newItemName === item?.name) {
      handleOnClose();
    } else if (newItemName && newItemName.trim().length > 0) {
      setIsLoading(true);
      await dispatch(storageThunks.updateItemMetadataThunk({ item, metadata, resourceToken }))
        .unwrap()
        .then(() => {
          setIsLoading(false);
          handleOnClose();
        })
        .catch((e) => {
          const errorMessage = e?.message?.includes('already exists') && translate('error.creatingFolder');
          setError(errorMessage);
          setIsLoading(false);
        });
    } else {
      setError(translate('error.folderCannotBeEmpty') as string);
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
    <Modal maxWidth="max-w-sm" isOpen={true} onClose={handleOnClose}>
      <form className="flex flex-col space-y-5" onSubmit={onRenameButtonClicked}>
        <p className="text-2xl font-medium text-gray-100">{translate('modals.renameItemDialog.title')}</p>

        <Input
          disabled={isLoading}
          className={`${error !== '' ? 'error' : ''}`}
          label={translate('modals.renameItemDialog.label') as string}
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
          <Button disabled={isLoading} variant="secondary" onClick={handleOnClose}>
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

export default EditItemNameDialog;
