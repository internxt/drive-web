import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import errorService from '../../../../../core/services/error.service';
import { getDatabaseProfileAvatar } from '../../../../../drive/services/database.service';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../store/hooks';
import { deleteUserAvatarThunk, updateUserAvatarThunk } from '../../../../../store/slices/user';
import UserHeader from '../components/UserHeader';

const UserHeaderContainer = () => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  if (!user) throw new Error('User is not defined');

  useEffect(() => {
    getDatabaseProfileAvatar().then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null));
  }, [user.avatar]);

  const deleteAvatar = async () => {
    await dispatch(deleteUserAvatarThunk()).unwrap();
    notificationsService.show({ type: ToastType.Success, text: translate('views.account.avatar.removed') });
  };

  const uploadAvatar = async ({ avatar }: { avatar: Blob }) => {
    try {
      await dispatch(updateUserAvatarThunk({ avatar })).unwrap();
      notificationsService.show({ type: ToastType.Success, text: translate('views.account.avatar.success') });
    } catch (err) {
      errorService.reportError(err);
      notificationsService.show({ type: ToastType.Error, text: translate('views.account.avatar.error') });
    }
  };

  return (
    <UserHeader
      user={user}
      avatar={avatarBlob}
      onDeleteAvatarClicked={deleteAvatar}
      onUploadAvatarClicked={uploadAvatar}
      displayFileLimitMessage={() =>
        notificationsService.show({ type: ToastType.Error, text: translate('views.account.avatar.underLimitSize') })
      }
      onSavingAvatarError={errorService.reportError}
    />
  );
};

export default UserHeaderContainer;
