import bigLogo from 'assets/icons/big-logo.svg';
import LogIn from '../../components/LogIn/LogIn';

export default function SignInView(): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-white sm:bg-gray-5">
      <div className="flex flex-shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <img src={bigLogo} width="120" alt="" />
      </div>
      <div className="flex h-full flex-col items-center justify-center">
        <LogIn />
      </div>
      <div className="flex flex-shrink-0 flex-row justify-center py-8">
        <a
          href="https://internxt.com/legal"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          Terms and conditions
        </a>
        <a
          href="https://help.internxt.com"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          Need help?
        </a>
      </div>
    </div>
  );
}
