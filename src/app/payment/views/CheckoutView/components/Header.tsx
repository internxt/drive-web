import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';

export const HeaderComponent = () => {
  return (
    <div className="flex w-full flex-row justify-between">
      <div className="flex flex-row space-x-2">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
        <p className="text-lg text-gray-70">Checkout</p>
      </div>
      <div className="flex flex-row space-x-2">
        <p className="text-gray-100">Already have an account?</p>
        <p className="text-primary">Log in</p>
      </div>
    </div>
  );
};
