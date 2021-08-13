import { useState } from 'react';
import { connect } from 'react-redux';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { storageActions, storageSelectors, storageThunks } from '../../../store/slices/storage';
import folderService from '../../../services/folder.service';
import { IFormValues, UserSettings } from '../../../models/interfaces';
import { RootState } from '../../../store';

import './CreateFolderDialog.scss';
import BaseInput from '../../Inputs/BaseInput';
import { SubmitHandler, useForm } from 'react-hook-form';
import notify from '../../Notifications';
import BaseDialog from '../BaseDialog/BaseDialog';
import { uiActions } from '../../../store/slices/ui';
import { selectorIsTeam } from '../../../store/slices/team';
import BaseButton from '../../Buttons/BaseButton';
import { StorageItemList } from '../../../models/enums';

interface CreateFolderDialogProps {
  onFolderCreated: () => void;
  user: UserSettings | undefined;
}

const CreateFolderDialog = ({
  onFolderCreated,
  user
}: CreateFolderDialogProps
) => {
  const { register, formState: { errors, isValid }, handleSubmit, reset } = useForm<IFormValues>({ mode: 'onChange', defaultValues: { createFolder: '' } });
  const [isLoading, setIsLoading] = useState(false);
  const currentFolderId: number = useAppSelector((state) => storageSelectors.currentFolderId(state));
  const isTeam: boolean = useAppSelector((state) => selectorIsTeam(state));
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const createButtonLabel = isValid ?
    isLoading ? 'Creating...' : 'Create' : 'Create';

  const onClose = (): void => {
    reset();
    dispatch(uiActions.setIsCreateFolderDialogOpen(false));
  };

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      setIsLoading(true);
      const data = await folderService.createFolder(isTeam, currentFolderId, formData.createFolder);

      dispatch(uiActions.setIsCreateFolderDialogOpen(false));

      onFolderCreated && onFolderCreated();

    } catch (err) {
      setIsLoading(false);
      onClose();
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      title='Create folder'
      onClose={onClose}
    >
      <form className='flex flex-col mt-6' onSubmit={handleSubmit(onSubmit)}>
        <div className='w-64 self-center'>
          <BaseInput
            placeholder='Enter folder name'
            label='createFolder'
            type={'text'}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Folder name must not be empty' }}
            error={errors.createFolder}
          />
        </div>

        <div className='flex justify-center items-center bg-l-neutral-20 py-6 mt-6'>
          <div className='flex w-64'>
            <BaseButton classes='cancel w-full mr-4' onClick={() => onClose()}>
              Cancel
            </BaseButton>
            <BaseButton classes="w-full primary border" disabled={isLoading || !isValid}
            >
              {createButtonLabel}
            </BaseButton>
          </div>
        </div>
      </form>
    </BaseDialog>
  );
};

export default connect(
  (state: RootState) => ({
    user: state.user.user
  }))(CreateFolderDialog);
