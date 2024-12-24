import { Button } from '@internxt/ui';
import { StoragePlan } from '@internxt/sdk/dist/drive/payments/types';
import { ArrowRight } from '@phosphor-icons/react';
import { bytesToString } from 'app/drive/services/size.service';
import { Translate } from 'app/i18n/types';
import Modal from 'app/shared/components/Modal';

interface ConfirmUpdateMembersModalProps {
  isOpen: boolean;
  plan: StoragePlan;
  updatedAmountOfSeats: number;
  isConfirmingMembersWorkspace: boolean;
  translate: Translate;
  onConfirmUpdate: () => void;
  onClose: () => void;
}

export const ConfirmUpdatedMembersModal = ({
  isOpen,
  plan,
  updatedAmountOfSeats,
  isConfirmingMembersWorkspace,
  translate,
  onConfirmUpdate,
  onClose,
}: ConfirmUpdateMembersModalProps): JSX.Element => {
  const currentAmountOfSeats = plan.amountOfSeats;
  const storagePerUser = plan.storageLimit;
  const monthlyPrice = plan.monthlyPrice;
  const warnMessageKey =
    currentAmountOfSeats && currentAmountOfSeats < updatedAmountOfSeats ? 'increaseStorage' : 'decreaseStorage';
  const currentTotalStorage = currentAmountOfSeats && bytesToString(storagePerUser * currentAmountOfSeats);
  const updatedTotalStorage = bytesToString(storagePerUser * updatedAmountOfSeats);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-lg">
      <div className="flex flex-col gap-5 p-5">
        <p className="text-2xl font-medium text-gray-100">
          {translate('preferences.workspace.billing.members.confirmUpdateModal.title')}
        </p>
        <p className="text-center text-lg text-gray-100">
          {translate('preferences.workspace.billing.members.confirmUpdateModal.confirmToProceed.text1')}
          <span className="font-semibold">{currentAmountOfSeats}</span>{' '}
          {translate('preferences.workspace.billing.members.confirmUpdateModal.confirmToProceed.to')}
          <span className="font-semibold">{updatedAmountOfSeats}</span>{' '}
          {translate('preferences.workspace.billing.members.confirmUpdateModal.confirmToProceed.text2')}
        </p>
        <div className="gap-5º flex w-full flex-row items-center justify-center">
          <MembersCard
            label={translate('preferences.workspace.billing.members.confirmUpdateModal.current')}
            members={currentAmountOfSeats as number}
            price={(monthlyPrice * currentAmountOfSeats).toFixed(2)}
            translate={translate}
          />
          <ArrowRight size={32} className="mx-5 font-semibold text-gray-20" />
          <MembersCard
            label={translate('preferences.workspace.billing.members.confirmUpdateModal.new')}
            members={updatedAmountOfSeats as number}
            price={(monthlyPrice * updatedAmountOfSeats).toFixed(2)}
            translate={translate}
          />
        </div>
        <div className="rounded-xl bg-gray-5 p-4">
          {
            <p className="text-center text-gray-80">
              {translate(`preferences.workspace.billing.members.confirmUpdateModal.${warnMessageKey}.text`)}
              <span className="font-semibold">{currentTotalStorage}</span>
              {translate(`preferences.workspace.billing.members.confirmUpdateModal.${warnMessageKey}.to`)}
              <span className="font-semibold">{updatedTotalStorage}</span>
            </p>
          }
        </div>
        <div className="flex flex-row justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isConfirmingMembersWorkspace}>
            {translate('actions.keepCurrent')}
          </Button>
          <Button variant="primary" disabled={isConfirmingMembersWorkspace} onClick={onConfirmUpdate}>
            {translate('actions.continue')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const MembersCard = ({
  members,
  price,
  label,
  translate,
}: {
  members: number;
  price: string;
  label: string;
  translate: Translate;
}): JSX.Element => {
  return (
    <div className="flex w-max flex-col items-center gap-2.5 rounded-xl border border-gray-10 bg-surface p-4 drop-shadow">
      <div className="w-max items-center rounded-full bg-gray-5 px-2 py-1">
        <p>{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-100">
        {members} {translate('preferences.workspace.billing.membersLabel')}
      </p>
      <p>€{price}/year</p>
    </div>
  );
};
