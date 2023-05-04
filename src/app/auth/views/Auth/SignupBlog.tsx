import { SignupComponent } from './AuthView';
import InternxtDevices from '../../../../assets/images/banner/Internxt-secure-cloud-storage.webp';

const textContent = {
  email: 'Email',
  passwordLabel: 'Password',
  emailEmpty: 'Email cannot be empty',
  passwordLabelEmpty: 'Password cannot be empty',
  buttonText: 'Get up to 10GB - For free',
  legal: {
    line1: 'By creating an account you accept the',
    line2: 'terms of service, and privacy policy',
  },
};

const SignupAuth = () => {
  return (
    <div className="flex h-52 w-full flex-col space-y-2 lg:items-start lg:pt-0">
      <SignupComponent
        buttonColor="bg-primary focus-visible:bg-primary-dark active:bg-primary-dark"
        textContent={textContent}
        appRedirect={true}
      />
    </div>
  );
};

export default function SignupBlog(): JSX.Element {
  return (
    <div className="hidden flex-col items-center justify-center overflow-hidden py-3 xs:flex lg:py-10">
      <div className="flex w-full flex-row bg-gradient-to-br from-blue-20 to-white">
        <div className="mt-5 mb-10 ml-11 flex w-full max-w-xs flex-col items-start justify-center">
          <p className="text-3xl font-semibold">
            Make privacy a priority and join<span className="text-primary"> Internxt </span>today
          </p>
          <div className="flex w-72">
            <SignupAuth />
          </div>
        </div>
        <div className="-ml-32 flex items-center overflow-hidden">
          <div className="relative left-56 top-4 flex flex-col overflow-hidden">
            <img
              src={InternxtDevices}
              width={534}
              height={340}
              about="desktop, laptop and phone with Internxt app"
              loading="eager"
              alt="desktop, laptop and phone with Internxt app"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
