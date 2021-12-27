import { TwoFactorAuthStepProps } from '.';
import UilExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle';
import i18n from '../../../../../../../i18n/services/i18n.service';

const TwoFactorAuthBackupKeyStep = (props: TwoFactorAuthStepProps): JSX.Element => {
  return (
    <div className="flex flex-col items-center justify-center text-neutral-500
                    bg-yellow-10 bg-opacity-75 p-6 rounded-lg"
    >
      <div className="flex flex-col items-center justify-center space-y-3">

        <div className="flex flex-row px-6 py-3 font-medium rounded-lg border border-yellow-30
                      bg-l-neutral-10 select-all">
          {props.backupKey}
        </div>
        
        <div className="flex flex-row items-center justify-center w-full space-x-3">
          <UilExclamationTriangle className="w-6 h-6 text-yellow-30" />
          <div className="flex flex-row flex-wrap text-xs font-medium text-yellow-50">
            {i18n.get('views.account.tabs.security.two-factor-auth.steps.backup-key.description.line1')}
            <br />
            {i18n.get('views.account.tabs.security.two-factor-auth.steps.backup-key.description.line2')}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TwoFactorAuthBackupKeyStep;
