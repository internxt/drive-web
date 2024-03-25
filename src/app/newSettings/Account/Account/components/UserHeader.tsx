import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';

import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import Avatar from '../../../../shared/components/Avatar';
import Dropdown from '../../../../shared/components/Dropdown';
import UploadAvatarModal from './UploadAvatarModal';

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
  const fullName = `${user.name} ${user.lastname}`;

  const dropdownOptions = [{ text: translate('views.account.avatar.updatePhoto'), onClick: () => setOpenModal(true) }];

  if (user.avatar) {
    dropdownOptions.push({ text: translate('views.account.avatar.removePhoto'), onClick: onDeleteAvatarClicked });
  }

  return (
    <div className={`${className} z-50 flex h-44 flex-col items-center p-5`}>
      <Dropdown
        options={dropdownOptions}
        classMenuItems={'-left-6 mt-1 w-max rounded-md border border-gray-10 bg-surface dark:bg-gray-5 py-1.5'}
        openDirection={'right'}
      >
        <div className="relative">
          <Avatar diameter={80} fullName={fullName} src={avatar ? URL.createObjectURL(avatar) : null} />
          <div className="absolute -bottom-1.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-3 border-surface bg-gray-5 text-gray-60 dark:bg-gray-10">
            <PencilSimple size={16} />
          </div>
        </div>
      </Dropdown>

      <h1 className="mt-3 text-xl font-medium text-gray-80">{fullName}</h1>
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
