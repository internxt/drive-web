import { useState } from 'react';
import { useForm } from 'react-hook-form';
import authService from 'app/auth/services/auth.service';
import errorService from 'app/core/services/error.service';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { TwoFactorAuthStepProps } from '.';

const TwoFactorAuthEnableStep = (props: TwoFactorAuthStepProps): JSX.Element => {

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabledSubmit2FA, setEnabledSubmit2FA] = useState(true);

  const {
    register,
    handleSubmit
  } = useForm();

  const onSubmit = async (formData) => {
    if (!isLoading) {
      try {
        if (formData.backupKey !== props.backupKey) {
          setError(i18n.get('error.backupKeyDontMatch'));
          return;
        }
        setIsLoading(true);

        await authService.store2FA(props.backupKey, formData.twoFactorCode);
        notificationsService.show(i18n.get('success.twoFactorAuthActivated'), ToastType.Success);
        props.setHas2FA(true);
      } catch (err: unknown) {
        const castedError = errorService.castError(err);

        setError(castedError.message || i18n.get('error.serverError'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form
      className="flex flex-col items-center justify-center space-y-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <span className="text-base font-medium">
        {i18n.get('views.account.tabs.security.two-factor-auth.steps.enable.description.line1')}
      </span>

      <div className="hidden flex-col space-y-0.5">
        <label className="text-sm font-medium text-m-neutral-100 mb-0.5">Backup key (from previous step)</label>
        <input
          {... register('backupKey')}
          className="pointer-events-none mb-4"
          type="text"
          value={props.backupKey}
          required
          readOnly
        />
      </div>

      <div className="flex flex-col space-y-0.5">
        <label className="text-sm font-medium text-m-neutral-100 mb-0.5">Two-factor authenticacion code</label>
        <input
          {... register('twoFactorCode')}
          id="input2fa"
          type="text"
          placeholder="App generated code"
          required
          autoComplete="false"
          minLength={1}
          onChange={(e) => { e.target.value.length >= 6 && setEnabledSubmit2FA(false); }}
        />
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center text-red-60 text-sm font-medium">
          <span className="px-3 py-1.5 bg-red-10 rounded-md">{error}</span>
        </div>
      )}

      <button type="submit" id="submit2fa" className="hidden" disabled={enabledSubmit2FA}></button>
    </form>
  );
};

export default TwoFactorAuthEnableStep;
