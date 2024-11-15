import { Button, RangeSlider } from '@internxt/internxtui';
import { X } from '@phosphor-icons/react';
import { Translate } from '../../../../../../i18n/types';
import Modal from '../../../../../../shared/components/Modal';

interface UpdateMembersModalProps {
  isOpen: boolean;
  minimumAllowedSeats: number;
  maximumAllowedSeats: number;
  currentAmountOfSeats: number;
  updatedAmountOfSeats: number;
  onSaveChanges: () => void;
  handleUpdateMembers: (value: number) => void;
  onClose: () => void;
  translate: Translate;
}

export const UpdateMembersModal = ({
  isOpen,
  minimumAllowedSeats,
  maximumAllowedSeats,
  currentAmountOfSeats,
  updatedAmountOfSeats,
  onSaveChanges,
  handleUpdateMembers,
  translate,
  onClose,
}: UpdateMembersModalProps): JSX.Element => (
  <Modal isOpen={isOpen} onClose={onClose} className="p-0">
    <div className="flex w-full items-center justify-between border-b border-gray-10 p-5">
      <span
        className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium"
        title={translate('preferences.workspace.members.actions.modifyStorage')}
      >
        {translate('preferences.workspace.members.actions.modifyStorage')}
      </span>
      <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out">
        <X onClick={onClose} size={22} />
      </div>
    </div>
    <div className="flex flex-col gap-6 p-5">
      <UpdateMembersCard
        minimumAllowedSeats={minimumAllowedSeats}
        maximumAllowedSeats={maximumAllowedSeats}
        currentAmountOfSeats={currentAmountOfSeats}
        updatedAmountOfSeats={updatedAmountOfSeats}
        translate={translate}
        handleUpdateMembers={handleUpdateMembers}
      />
      <div className="flex w-full flex-row justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {translate('actions.cancel')}
        </Button>
        <Button variant="primary" onClick={onSaveChanges}>
          {translate('actions.saveChanges')}
        </Button>
      </div>
    </div>
  </Modal>
);

const UpdateMembersCard = ({
  translate,
  minimumAllowedSeats,
  maximumAllowedSeats,
  currentAmountOfSeats,
  updatedAmountOfSeats,
  handleUpdateMembers,
}: Pick<
  UpdateMembersModalProps,
  | 'translate'
  | 'currentAmountOfSeats'
  | 'updatedAmountOfSeats'
  | 'handleUpdateMembers'
  | 'maximumAllowedSeats'
  | 'minimumAllowedSeats'
>): JSX.Element => (
  <>
    <p className="text-lg text-gray-100">{translate('preferences.workspace.billing.members.expandNumber')}</p>
    <div className="flex w-full flex-col gap-6 rounded-xl border border-gray-10 bg-surface p-6">
      <div className="flex h-full w-full flex-row justify-center gap-8">
        <div className="flex w-full max-w-[165px] flex-col items-start gap-0.5">
          <p className="text-3xl font-medium text-gray-100">{currentAmountOfSeats}</p>
          <p className="text-gray-60">{translate('preferences.workspace.billing.membersLabel')}</p>
        </div>
        <div className="flex flex-col border border-gray-1" />
        <div className="flex w-full max-w-[165px] flex-col items-start gap-0.5">
          <p className="text-3xl font-medium text-gray-100">{updatedAmountOfSeats}</p>
          <p className="text-gray-60">{translate('preferences.workspace.billing.membersLabel')}</p>
        </div>
      </div>

      <RangeSlider
        value={updatedAmountOfSeats}
        min={minimumAllowedSeats}
        max={maximumAllowedSeats}
        step={1}
        onChange={handleUpdateMembers}
        ariaLabel="Modify workspace members"
        className="flex w-full flex-col"
      />
    </div>
  </>
);
