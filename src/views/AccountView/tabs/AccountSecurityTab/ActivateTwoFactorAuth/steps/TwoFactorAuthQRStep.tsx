import { TwoFactorAuthStepProps } from '.';

const TwoFactorAuthQRStep = (props: TwoFactorAuthStepProps): JSX.Element => {
  return (
    <div className="square flex flex-col justify-center items-center p-16 text-center">
      <img src={props.qr} alt="Bidi Code" />
      <div className="mb-8">Use Authy, Google Authentication or a similar app to scan the QR Code below</div>
      <div className="mb-3 bg-l-neutral-20 p-4 rounded-md w-max font-semibold text-neutral-500 select-text">
        {props.backupKey}
      </div>
      <div className="security-info_texts">
        If you are unable to scan the QR code
        <br />
        enter this code into the app.
      </div>
    </div>
  );
};

export default TwoFactorAuthQRStep;
