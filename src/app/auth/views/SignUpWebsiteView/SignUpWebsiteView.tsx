import SignUpWebsite from '../../components/SignUp/SignUpWebsite';
export interface SignUpViewProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

const SignUWebsiteView = (props: SignUpViewProps): JSX.Element => {
  return <SignUpWebsite {...props} />;
};

export default SignUWebsiteView;
