import { TwoFactorAuthStepProps } from '.';
import i18n from '../../../../../../../i18n/services/i18n.service';

const TwoFactorAuthQRStep = (props: TwoFactorAuthStepProps): JSX.Element => {
  return (
    <div className="flex flex-row items-stretch justify-center space-x-6 text-neutral-500">

      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-40 h-40 pointer-events-none select-none">
          <img src={props.qr} alt="Bidi Code" />
        </div>
        <div className="text-sm font-medium">
          {i18n.get('views.account.tabs.security.two-factor-auth.steps.qr.description.line1')}
        </div>
      </div>

      <div className="relative flex flex-col justify-center items-center text-xs font-medium
                      text-neutral-80 space-y-2"
      >
        <div className="flex flex-col w-px h-full bg-l-neutral-40"></div>
        <span>{i18n.get('views.account.tabs.security.two-factor-auth.steps.qr.description.line2')}</span>
        <div className="flex flex-col w-px h-full bg-l-neutral-40"></div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="flex flex-row px-6 py-3 font-medium rounded-lg border border-l-neutral-50
                      bg-neutral-10 select-all">
          {props.backupKey}
        </div>
        <div className="text-sm font-medium text-center">
          {i18n.get('views.account.tabs.security.two-factor-auth.steps.qr.description.line3')}
        </div>
      </div>

    </div>
  );
};

export default TwoFactorAuthQRStep;
