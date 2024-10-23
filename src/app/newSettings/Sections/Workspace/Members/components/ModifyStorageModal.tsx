import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { Button, RangeSlider } from '@internxt/internxtui';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import Modal from '../../../../../shared/components/Modal';
import UserCard from './UserCard';
import { MemberRole } from '../../../../../newSettings/types/types';
import { bytesToString } from '../../../../../drive/services/size.service';

const MINIMUM_BYTES_TO_ASSIGN = 100 * 1024 * 1024;

interface ModifyStorageModal {
  isOpen: boolean;
  memberRole: MemberRole;
  memberName: {
    name: string;
    lastName: string;
  };
  memberStorage: string;
  memberEmail: string;
  totalUsedStorage: string;
  isLoading?: boolean;
  onClose: () => void;
}

export const ModifyStorageModal = ({
  isOpen,
  memberRole,
  memberName,
  memberEmail,
  memberStorage,
  totalUsedStorage,
  isLoading,
  onClose,
}: ModifyStorageModal): JSX.Element => {
  const { translate } = useTranslationContext();

  const maxStorage = Number(memberStorage);
  const initialStorage = Math.max(Number(totalUsedStorage), MINIMUM_BYTES_TO_ASSIGN);
  const [newStorage, setNewStorage] = useState(initialStorage);

  const spaceLeft = Math.max(maxStorage - newStorage, 0);
  const formattedAssignedStorage = bytesToString(newStorage);
  const formattedSpaceLeft = spaceLeft === 0 ? '-' : bytesToString(spaceLeft);

  const handleSliderChange = (newValue: number) => {
    setNewStorage(newValue);
  };

  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose} preventClosing={isLoading}>
      <div className="flex h-16 w-full items-center justify-between space-x-4 border-b border-gray-10 px-5">
        <span
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium"
          title={translate('preferences.workspace.members.actions.modifyStorage')}
        >
          {translate('preferences.workspace.members.actions.modifyStorage')}
        </span>
        <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out">
          <X onClick={() => (isLoading ? null : onClose())} size={22} />
        </div>
      </div>
      <div className="flex flex-col gap-6 p-5">
        <div className="flex w-full overflow-hidden rounded-xl border border-gray-10 drop-shadow">
          <table width={'100%'}>
            <colgroup>
              <col width={'70%'} />
              <col width={'30%'} />
            </colgroup>
            <thead className="bg-gray-1">
              <tr>
                <th scope="col" className="text-gray-500 py-3.5 pl-6 text-left text-sm font-medium">
                  {translate('preferences.workspace.members.modifyStorageModal.user')}
                </th>
                <th scope="col" className="text-gray-500 text-left text-sm font-medium">
                  <div className="flex h-full w-full flex-row border-l border-gray-10 px-5">
                    {translate('preferences.workspace.members.modifyStorageModal.storage')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-gray-500 py-2.5 pl-6 text-left text-sm font-medium">
                  <UserCard
                    email={memberEmail}
                    name={memberName.name}
                    lastName={memberName.lastName}
                    avatarSrc={null}
                    role={memberRole}
                  />
                </td>
                <td className="text-gray-500 px-6 text-left text-sm font-medium">{bytesToString(maxStorage)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex w-full flex-col gap-2.5">
          <div className="flex w-full flex-col gap-6 rounded-xl border border-gray-10 bg-surface p-6 drop-shadow">
            <div className="flex h-full w-full flex-row justify-center gap-8">
              <div className="flex w-full max-w-[165px] flex-col items-start gap-0.5">
                <p className="text-3xl font-medium text-gray-100">{formattedAssignedStorage}</p>
                <p className="text-gray-60">
                  {translate('preferences.workspace.members.modifyStorageModal.spaceAssigned')}
                </p>
              </div>
              <div className="flex flex-col border border-gray-1" />
              <div className="flex w-full max-w-[165px] flex-col items-start gap-0.5">
                <p className="text-3xl font-medium text-gray-100">{formattedSpaceLeft}</p>
                <p className="text-gray-60">
                  {translate('preferences.workspace.members.modifyStorageModal.spaceLeft')}
                </p>
              </div>
            </div>

            <RangeSlider
              value={newStorage}
              min={initialStorage}
              max={maxStorage + initialStorage}
              step={0.1 * 1024 * 1024 * 1024}
              onChange={handleSliderChange}
              disabled={isLoading}
              ariaLabel="Modify storage"
              className="flex w-full flex-col"
            />
          </div>

          <div className="flex w-full flex-row items-end justify-end gap-2">
            <Button id={'cancel-button'} disabled={isLoading} variant="secondary" onClick={onClose}>
              {translate('preferences.workspace.members.modifyStorageModal.cancel')}
            </Button>
            <Button loading={isLoading} disabled={isLoading}>
              {translate('preferences.workspace.members.modifyStorageModal.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
