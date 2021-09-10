import { TwoFactorAuthStepProps } from '.';

const TwoFactorAuthQRStep = (props: TwoFactorAuthStepProps): JSX.Element => {
  return (
    <div className="flex flex-col">
      <div>Use Authy, Google Authentication or a similar app to scan the QR Code below</div>
      <div className="flex items-center">
        <img src={props.qr} alt="Bidi Code" />
        <div className="flex flex-col justify-between h-full py-3 ml-4">
          <div className="bg-l-neutral-20 p-4 rounded-md w-max font-semibold text-neutral-500 select-text">
            {props.backupKey}
          </div>
          <div className="security-info_texts">
            If you are unable to scan the QR code
            <br />
            enter this code into the app.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuthQRStep;
