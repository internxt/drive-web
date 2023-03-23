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
    <div className="flex w-full flex-col space-y-2 lg:items-start lg:pt-0">
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
    <div className="flex w-full max-w-7xl flex-col items-center justify-center overflow-hidden py-3 lg:py-16">
      <div className="flex w-full  flex-row bg-gradient-to-br from-blue-20 to-white">
        <div className="mt-11 mb-11 ml-11 flex w-full max-w-xs flex-col items-start justify-center">
          <p className="text-4xl font-semibold">
            Keep those now clean files safe, <span className="text-primary">join Internxt for free</span>
          </p>
          <div className="flex w-64">
            <SignupAuth />
          </div>
        </div>
        <div className="-ml-40 flex items-center">
          <div className="relative left-56 top-5 flex flex-col overflow-hidden">
            <img
              src={InternxtDevices}
              width={734}
              height={540}
              // draggable="false"
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
