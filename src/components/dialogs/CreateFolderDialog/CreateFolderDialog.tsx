import { useState } from 'react';
import { connect, useSelector } from 'react-redux';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import BaseDialog from '../BaseDialog/BaseDialog';
import { selectIsOpenCreateFolder, setIsCreateFolderDialogOpen } from '../../../store/slices/ui';
import { storageSelectors, storageThunks } from '../../../store/slices/storage';
import folderService from '../../../services/folder.service';
import { IFormValues, UserSettings } from '../../../models/interfaces';
import { RootState } from '../../../store';

import './CreateFolderDialog.scss';
import AuthInput from '../../Inputs/AuthInput';
import { SubmitHandler, useForm } from 'react-hook-form';
import AuthButton from '../../Buttons/AuthButton';
import notify from '../../Notifications';
import BaseDialog2 from '../BaseDialog2.0/BaseDialog2.0';

interface CreateFolderDialogProps {
  user: UserSettings | undefined;
}

const CreateFolderDialog = ({
  user
}: CreateFolderDialogProps
) => {
  const { register, formState: { errors, isValid }, handleSubmit, reset } = useForm<IFormValues>({ mode: 'onChange', defaultValues: { createFolder: '' } });
  const [isLoading, setIsLoading] = useState(false);
  const currentFolderId: number = useSelector((state: RootState) => storageSelectors.currentFolderId(state));
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsOpenCreateFolder);

  const onClose = (): void => {
    reset();
    dispatch(setIsCreateFolderDialogOpen(false));
  };

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      setIsLoading(true);
      await folderService.createFolder(!!user?.teams, currentFolderId, formData.createFolder);

      dispatch(storageThunks.fetchFolderContentThunk());
      dispatch(setIsCreateFolderDialogOpen(false));
      reset();

    } catch (err) {
      if (err.includes('already exists')) {
        notify('Folder with the same name already exists', 'error');
      } else {
        notify(err.message || err, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseDialog2
      isOpen={isOpen}
      title='Create folder'
      onClose={onClose}
    >
      <form className='flex flex-col mt-6' onSubmit={handleSubmit(onSubmit)}>
        <div className='w-64 self-center'>
          <AuthInput
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
            <button onClick={() => onClose()} className='secondary_dialog w-full mr-4'>
              Cancel
            </button>
            <AuthButton text='Create' textWhenDisabled={isValid ? 'Creating...' : 'Create'} isDisabled={isLoading || !isValid} />
          </div>
        </div>
      </form>
    </BaseDialog2>
  );
};

export default connect(
  (state: RootState) => ({
    user: state.user.user
  }))(CreateFolderDialog);
