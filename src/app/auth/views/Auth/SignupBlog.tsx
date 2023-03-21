import { SignupComponent } from './AuthView';

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
    <div className="flex w-full max-w-lg flex-col items-center space-y-2 pt-10 lg:w-max lg:items-start lg:pt-0">
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
    <div className="flex flex-col items-center justify-center py-3 px-5 lg:py-16 lg:px-40">
      <div className="flex h-full w-full flex-col items-center justify-center space-y-7 px-5 lg:flex-row lg:space-y-0 lg:space-x-48">
        <div className="flex w-full max-w-md flex-col justify-between space-y-3 lg:space-y-10">
          <SignupAuth />
        </div>
      </div>
    </div>
  );
}
