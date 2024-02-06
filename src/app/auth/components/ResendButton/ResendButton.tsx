import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';

interface IResendButtonProps {
  enableButton: boolean;
  onClick: () => void;
  countDown: number;
}

export const ResendButton = ({ enableButton, onClick, countDown }: IResendButtonProps) => {
  const { translate } = useTranslationContext();

  if (enableButton) {
    return (
      <button className="ml-2 cursor-pointer text-primary" onClick={onClick}>
        {translate('blockedAccount.resend')}
      </button>
    );
  }
  return <span className="ml-2 font-medium">&nbsp;{countDown}</span>;
};
