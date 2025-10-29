import { useState, useEffect } from 'react';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import { userHas2FAStored } from '../../../../../auth/services/auth.service';
import Section from '../../../../../newSettings/Sections/General/components/Section';
import Card from '../../../../../shared/components/Card';
import { Button, Loader } from '@internxt/ui';
import TwoFactorAuthenticationEnableModal from './TwoFactorAuthenticationEnableModal';
import TwoFactorAuthenticationDisableModal from './TwoFactorAuthenticationDisableModal';

const TwoFactorAuthentication = ({ password }: { password: string }): JSX.Element => {
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading');
  const { translate } = useTranslationContext();

  useEffect(() => {
    userHas2FAStored().then(({ tfaEnabled }) => {
      if (tfaEnabled) {
        setStatus('enabled');
      } else {
        setStatus('disabled');
      }
    });
  }, []);

  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  return (
    <Section className="basis-1/2" title={translate('views.account.tabs.security.2FA.title')}>
      <Card>
        <p className="text-gray-60">{translate('views.account.tabs.security.2FA.description')}</p>
        <div className="mt-3">
          {status === 'enabled' ? (
            <div className="flex">
              <div className="flex items-center font-medium text-green">
                <Button className="mr-4" variant="secondary" onClick={() => setDisableModalOpen(true)}>
                  {translate('views.account.tabs.security.2FA.disable')}
                </Button>
                <div className="mr-2.5 h-5 w-5 rounded-full bg-green/20 p-1">
                  <div className="h-3 w-3 rounded-full bg-green"></div>
                </div>
                <p className="text-base font-medium text-green">
                  {translate('views.account.tabs.security.2FA.enabled')}
                </p>
              </div>
            </div>
          ) : status === 'disabled' ? (
            <div className="flex items-center">
              <Button variant="secondary" onClick={() => setEnableModalOpen(true)} className="mr-4">
                {translate('views.account.tabs.security.2FA.button')}
              </Button>
              <div className="mr-2.5 h-5 w-5 rounded-full bg-gray-10 p-1">
                <div className="h-3 w-3 rounded-full bg-gray-40"></div>
              </div>
              <p className="text-base font-medium text-gray-40">
                {translate('views.account.tabs.security.2FA.disabled')}
              </p>
            </div>
          ) : (
            <div className="flex h-10 items-center">
              <Loader classNameLoader="block h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </Card>

      <TwoFactorAuthenticationEnableModal
        isOpen={enableModalOpen}
        onClose={() => setEnableModalOpen(false)}
        onEnabled={() => setStatus('enabled')}
      />
      <TwoFactorAuthenticationDisableModal
        isOpen={disableModalOpen}
        onClose={() => setDisableModalOpen(false)}
        onDisabled={() => setStatus('disabled')}
        password={password}
      />
    </Section>
  );
};

export default TwoFactorAuthentication;
