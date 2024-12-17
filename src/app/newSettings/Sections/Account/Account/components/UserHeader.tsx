import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';

import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import UploadAvatarModal from './UploadAvatarModal';
import { Avatar, Dropdown } from '@internxt/ui';

interface UserHeaderProps {
  className?: string;
  user: UserSettings;
  avatar: Blob | null;
  onDeleteAvatarClicked: () => void;
  onUploadAvatarClicked: ({ avatar }: { avatar: Blob }) => Promise<void>;
  displayFileLimitMessage: () => void;
  onSavingAvatarError: (error: unknown) => void;
}

export default function UserHeader({
  className = '',
  user,
  avatar,
  onDeleteAvatarClicked,
  onUploadAvatarClicked,
  displayFileLimitMessage,
  onSavingAvatarError,
}: Readonly<UserHeaderProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const [openModal, setOpenModal] = useState(false);
  const name = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = name + ' ' + lastName;

  const dropdownOptions = [{ text: translate('views.account.avatar.updatePhoto'), onClick: () => setOpenModal(true) }];

  if (user.avatar) {
    dropdownOptions.push({ text: translate('views.account.avatar.removePhoto'), onClick: onDeleteAvatarClicked });
  }

  return (
    <div className={`${className} flex flex-col items-center p-5`}>
      <Dropdown
        options={dropdownOptions}
        classMenuItems={'-left-10 mt-0 w-max rounded-md border border-gray-10 bg-surface dark:bg-gray-5'}
        openDirection={'right'}
      >
        <div className="relative">
          <Avatar diameter={128} fullName={fullName} src={avatar ? URL.createObjectURL(avatar) : null} />
          <div className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-surface bg-gray-5 text-gray-100 dark:bg-gray-10">
            <PencilSimple size={20} />
          </div>
        </div>
      </Dropdown>

      <h1 className="mt-4 text-xl font-medium text-gray-80">{fullName}</h1>
      <h2 className="leading-tight text-gray-50">{user.email}</h2>

      <UploadAvatarModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onUploadAvatarClicked={onUploadAvatarClicked}
        displayFileLimitMessage={displayFileLimitMessage}
        onSavingAvatarError={onSavingAvatarError}
      />
    </div>
  );
}
