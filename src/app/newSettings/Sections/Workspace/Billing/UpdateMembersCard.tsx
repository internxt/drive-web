import { Button } from '@internxt/internxtui';
import { Translate } from '../../../../i18n/types';
import Card from '../../../../shared/components/Card';

interface UpdateMembersCardProps {
  totalWorkspaceSeats: number;
  translate: Translate;
  onChangeMembersButtonClicked: () => void;
}

export const UpdateMembersCard = ({
  totalWorkspaceSeats,
  translate,
  onChangeMembersButtonClicked,
}: UpdateMembersCardProps): JSX.Element => {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-row items-center justify-between">
        <p className="text-xl font-medium text-gray-100">{translate('preferences.workspace.billing.members.title')}</p>
        <Button variant="secondary" onClick={onChangeMembersButtonClicked}>
          {translate('preferences.workspace.billing.members.editMembers')}
        </Button>
      </div>
      <Card className="flex flex-col gap-1 rounded-xl border border-gray-10 p-5 drop-shadow">
        <p className="text-medium text-sm text-gray-100">
          {translate('preferences.workspace.billing.members.numberOfMembers')}
        </p>
        <p className="text-sm text-gray-60">
          {totalWorkspaceSeats + ' ' + translate('preferences.workspace.billing.membersLabel')}
        </p>
      </Card>
    </div>
  );
};
