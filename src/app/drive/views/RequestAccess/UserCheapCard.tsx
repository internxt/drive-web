import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button } from '@internxt/ui';

interface RequestAccessUserCardProps {
  user: UserSettings | undefined;
  onChangeAccount: () => void;
}

const TEXTAREA_MAX_LENGTH = 1000;

const UserCheapCard = ({ user, onChangeAccount }: Readonly<RequestAccessUserCardProps>): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="request-access-user-container mt-4 w-full rounded-2xl bg-surface p-5 text-gray-100 transition-all duration-100 ease-out sm:shadow-subtle-hard">
      <div className="flex w-full items-center justify-between">
        <div className="mr-4 flex-1">
          <p className="text-sm font-medium">{translate('modals.shareModal.requestAccess.logged')}</p>
          <p
            className="font-regular mt-0.5 flex-1 truncate text-base text-gray-50"
            style={{ maxWidth: '167px' }}
            title={user?.email}
          >
            {user?.email}
          </p>
        </div>
        <Button variant="secondary" className="cursor-pointer" onClick={onChangeAccount}>
          {translate('modals.shareModal.requestAccess.change')}
        </Button>
      </div>
    </div>
  );
};

export default UserCheapCard;
