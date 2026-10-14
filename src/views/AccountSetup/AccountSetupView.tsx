import { useParams } from 'react-router-dom';
import { AccountAlreadyExistsMessage } from './components/AccountAlreadyExistsMessage';
import { AccountSetupForm } from './components/AccountSetupForm';
import { AccountSetupLayout } from './components/AccountSetupLayout';
import { InvalidLinkMessage } from './components/InvalidLinkMessage';
import { AccountSetupStatus, useAccountSetup } from './hooks/useAccountSetup';

const AccountSetupView = (): JSX.Element => {
  const { token } = useParams<{ token: string }>();
  const { status, isSubmitting, hasSubmitFailed, setUpAccount } = useAccountSetup(token);

  const contentByStatus: Record<AccountSetupStatus, JSX.Element> = {
    form: <AccountSetupForm isSubmitting={isSubmitting} hasSubmitFailed={hasSubmitFailed} onSubmit={setUpAccount} />,
    invalidLink: <InvalidLinkMessage />,
    accountAlreadyExists: <AccountAlreadyExistsMessage />,
  };

  return <AccountSetupLayout>{contentByStatus[status]}</AccountSetupLayout>;
};

export default AccountSetupView;
