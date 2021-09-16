import { TwoFactorAuthStepProps } from '.';

const TwoFactorAuthBackupKeyStep = (props: TwoFactorAuthStepProps): JSX.Element => {
  return (
    <div className="py-8 px-16 square flex flex-col items-center justify-center">
      <div className="text-center mb-6">Your backup key is below. You will need this incase you lose your device.</div>
      <div className="bg-l-neutral-20 py-16 px-4 rounded-lg w-max font-semibold text-neutral-500 select-text mb-6">
        {props.backupKey}
      </div>
      <div> Keep an offline backup of your key. Keep it safe and secure.</div>
    </div>
  );
};

export default TwoFactorAuthBackupKeyStep;
