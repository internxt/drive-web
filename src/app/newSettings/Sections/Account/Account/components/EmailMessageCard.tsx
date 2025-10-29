import { Info } from '@phosphor-icons/react';
import { t } from 'i18next';

type EmailVerificationMessageCardProps = {
  isVerified?: boolean;
  disableButton?: boolean;
  onClickResendButton: () => void;
};

const EmailVerificationMessageCard = ({
  isVerified,
  disableButton,
  onClickResendButton,
}: EmailVerificationMessageCardProps): JSX.Element => {
  if (isVerified) return <></>;

  return (
    <div className="flex h-11 w-auto flex-row items-center rounded-lg bg-primary/10">
      <span className="flex w-auto grow flex-row items-center px-3 py-3 text-sm font-normal text-gray-100">
        <Info size={24} weight="fill" className="mr-2 text-primary" />
        <span>{t('views.emailVerification.message.emailNotVerifiedPartOne')}&nbsp;</span>
        <button onClick={onClickResendButton} disabled={disableButton} className="text-sm font-medium text-primary">
          {t('views.emailVerification.message.emailNotVerifiedPartTwo')}
        </button>
      </span>
    </div>
  );
};

export default EmailVerificationMessageCard;
