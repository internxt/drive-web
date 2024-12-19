import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { Button, RangeSlider } from '@internxt/ui';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import Modal from '../../../../../shared/components/Modal';
import UserCard from './UserCard';
import { MemberRole } from '../../../../../newSettings/types/types';
import { bytesToString } from '../../../../../drive/services/size.service';
import { ActionDialog } from '../../../../../contexts/dialog-manager/ActionDialogManager.context';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { useHotkeys } from 'react-hotkeys-hook';

const MINIMUM_BYTES_TO_ASSIGN = 100 * 1024 * 1024;
const MODIFY_STORAGE_DIALOG_KEY = ActionDialog.ModifyStorage;
interface ModifyStorageModalProps {
  maxSpacePerMember: string;
  memberRole?: MemberRole;
  memberName?: {
    name: string;
    lastName: string;
  };
  memberEmail?: string;
  totalUsedStorage?: string;
  memberSpace?: string;
  isLoading?: boolean;
  onUpdateUserStorage: (newStorageValue: number) => void;
}

export const ModifyStorageModal = (): JSX.Element => {
  const { translate } = useTranslationContext();

  const { closeDialog, getDialogData, isDialogOpen } = useActionDialog();
  const isOpen = isDialogOpen(MODIFY_STORAGE_DIALOG_KEY);

  const {
    maxSpacePerMember,
    isLoading,
    memberEmail,
    memberName,
    memberSpace,
    memberRole,
    totalUsedStorage,
    onUpdateUserStorage,
  } = getDialogData(MODIFY_STORAGE_DIALOG_KEY) as ModifyStorageModalProps;

  const maxStorageForWorkspaceMember = Number(maxSpacePerMember);
  const minimumUserStorage = Math.max(Number(totalUsedStorage), MINIMUM_BYTES_TO_ASSIGN);
  const [newStorage, setNewStorage] = useState(minimumUserStorage);
  const shouldRenderUserTable = memberEmail && memberName?.name && memberName?.lastName && memberRole && memberSpace;
  const formattedAssignedStorage = bytesToString(newStorage);
  const spaceLeft = Math.max(maxStorageForWorkspaceMember - newStorage, 0);
  const formattedSpaceLeft = spaceLeft === 0 ? '-' : bytesToString(spaceLeft);

  const handleSliderChange = (newUserStorage: number) => {
    const roundedSpace = Math.round(newUserStorage);
    const validatedSpace = Math.min(roundedSpace, maxStorageForWorkspaceMember);
    setNewStorage(validatedSpace);
  };

  const onClose = () => {
    closeDialog(MODIFY_STORAGE_DIALOG_KEY);
  };

  useHotkeys(
    'Enter',
    () => {
      onUpdateUserStorage(newStorage);
    },
    [newStorage],
    { enableOnFormTags: ['input'] },
  );

  useHotkeys(
    'Esc',
    (event) => {
      if (isOpen) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    },
    { enableOnFormTags: ['input'], preventDefault: true },
  );

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
        {shouldRenderUserTable && (
          <UserCardAndStorageTable
            memberEmail={memberEmail}
            memberName={memberName}
            memberRole={memberRole}
            maxStorageForWorkspaceMember={Number(memberSpace)}
            translate={translate}
          />
        )}
        <div className="flex w-full flex-col gap-2.5">
          <StorageSelectionCard
            newStorage={newStorage}
            minimumUserStorage={minimumUserStorage}
            maxStorageForWorkspaceMember={maxStorageForWorkspaceMember}
            formattedAssignedStorage={formattedAssignedStorage}
            formattedSpaceLeft={formattedSpaceLeft}
            isLoading={isLoading ?? false}
            handleSliderChange={handleSliderChange}
            translate={translate}
          />

          <div className="flex w-full flex-row items-end justify-end gap-2">
            <Button id={'cancel-button'} disabled={isLoading} variant="secondary" onClick={onClose}>
              {translate('preferences.workspace.members.modifyStorageModal.cancel')}
            </Button>
            <Button loading={isLoading} disabled={isLoading} onClick={() => onUpdateUserStorage(newStorage)}>
              {translate('preferences.workspace.members.modifyStorageModal.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const UserCardAndStorageTable = ({
  memberEmail,
  memberName,
  memberRole,
  maxStorageForWorkspaceMember,
  translate,
}: {
  memberEmail: string;
  memberName: Record<'name' | 'lastName', string>;
  memberRole: MemberRole;
  maxStorageForWorkspaceMember: number;
  translate: (key: string, props?: Record<string, unknown>) => string;
}) => (
  <div className="flex w-full overflow-hidden rounded-xl border border-gray-10">
    <table width={'100%'}>
      <colgroup>
        <col width={'70%'} />
        <col width={'30%'} />
      </colgroup>
      <thead className="border-b border-gray-10 bg-gray-1">
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
          <td className="text-gray-500 px-6 text-left text-sm font-medium">
            {bytesToString(maxStorageForWorkspaceMember)}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const StorageSelectionCard = ({
  formattedAssignedStorage,
  formattedSpaceLeft,
  newStorage,
  minimumUserStorage,
  maxStorageForWorkspaceMember,
  isLoading,
  handleSliderChange,
  translate,
}: {
  formattedAssignedStorage: string;
  formattedSpaceLeft: string;
  newStorage: number;
  minimumUserStorage: number;
  maxStorageForWorkspaceMember: number;
  isLoading: boolean;
  handleSliderChange: (newStorage: number) => void;
  translate: (key: string, props?: Record<string, unknown>) => string;
}) => (
  <div className="flex w-full flex-col gap-6 rounded-xl border border-gray-10 bg-surface p-6">
    <div className="flex h-full w-full flex-row justify-center gap-8">
      <div className="flex w-full max-w-[165px] flex-col items-start gap-0.5">
        <p className="text-3xl font-medium text-gray-100">{formattedAssignedStorage}</p>
        <p className="text-gray-60">{translate('preferences.workspace.members.modifyStorageModal.spaceAssigned')}</p>
      </div>
      <div className="flex flex-col border border-gray-1" />
      <div className="flex w-full max-w-[165px] flex-col items-start gap-0.5">
        <p className="text-3xl font-medium text-gray-100">{formattedSpaceLeft}</p>
        <p className="text-gray-60">{translate('preferences.workspace.members.modifyStorageModal.spaceLeft')}</p>
      </div>
    </div>

    <RangeSlider
      value={newStorage}
      min={minimumUserStorage}
      max={maxStorageForWorkspaceMember + minimumUserStorage}
      step={100 * 1024 * 1024}
      onChange={handleSliderChange}
      disabled={isLoading}
      ariaLabel="Modify storage"
      className="flex w-full flex-col"
    />
  </div>
);
