import { TwoFactorAuthStepProps } from '.';

const TwoFactorAuthBackupKeyStep = (props: TwoFactorAuthStepProps): JSX.Element => {
  return (
    <div className="flex flex-col items-center">
      <div className="security-info_texts text-center">
        Your backup key is below. You will need this incase you lose your device.
        <br />
        Keep an offline backup of your key. Keep it safe and secure.
      </div>
      <div className="bg-l-neutral-20 p-4 rounded-md w-max font-semibold text-neutral-500 mt-4 select-text">
        {props.backupKey}
      </div>
    </div>
  );
};

export default TwoFactorAuthBackupKeyStep;
