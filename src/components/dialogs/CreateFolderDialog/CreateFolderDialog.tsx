import { createRef, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';

import { useAppDispatch } from '../../../store/hooks';
import BaseDialog from '../BaseDialog/BaseDialog';
import { setIsCreateFolderDialogOpen } from '../../../store/slices/ui';
import { storageSelectors, storageThunks } from '../../../store/slices/storage';
import folderService, { ICreatedFolder } from '../../../services/folder.service';
import { toast } from 'react-toastify';
import { IFormValues, UserSettings } from '../../../models/interfaces';
import { RootState } from '../../../store';

import './CreateFolderDialog.scss';
import AuthInput from '../../Inputs/AuthInput';
import { SubmitHandler, useForm } from 'react-hook-form';
import { illegalRe, invalidCharacters } from '../../../services/validation.service';
import AuthButton from '../../Buttons/AuthButton';
import ButtonTextOnly from '../../Buttons/ButtonTextOnly';
import notify from '../../Notifications';

interface CreateFolderDialogProps {
  open: boolean;
  user: UserSettings | undefined;
}

const CreateFolderDialog = ({
  open,
  user
}: CreateFolderDialogProps
) => {
  const { register, formState: { errors, isValid }, handleSubmit, reset, setFocus } = useForm<IFormValues>({ mode: 'onChange', defaultValues: { createFolder: '' } });
  const [isLoading, setIsLoading] = useState(false);
  const currentFolderId: number = useSelector((state: RootState) => storageSelectors.currentFolderId(state));
  const dispatch = useAppDispatch();

  const onCancel = (): void => {
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

  useEffect(() => {
    setFocus('createFolder');
  }, []);

  return (
    <BaseDialog title="Create folder" open={open} onClose={onCancel}>
      <form onSubmit={handleSubmit(onSubmit)} className="px-12">
        <AuthInput
          placeholder='Enter folder name'
          label='createFolder'
          type={'text'}
          register={register}
          required={true}
          minLength={{ value: 1, message: 'Folder name must not be empty' }}
          error={errors.createFolder}
        />

        <div className='flex justify-center mt-3'>
          <button onClick={onCancel} className='text-sm text-blue-60 w-full hover:bg-blue-20 mr-4 rounded'>
            Cancel
          </button>
          <AuthButton text='Create' textWhenDisabled={isValid ? 'Creating...' : 'Create'} isDisabled={isLoading || !isValid} />
        </div>
      </form>
    </BaseDialog>
  );
};

export default connect(
  (state: RootState) => ({
    user: state.user.user
  }))(CreateFolderDialog);
