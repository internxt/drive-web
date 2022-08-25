import bigLogo from 'assets/icons/big-logo.svg';

import SignUp from '../../components/SignUp/SignUp';

import { Link } from 'react-router-dom';
export interface SignUpViewProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

const SignUpView = (props: SignUpViewProps): JSX.Element => {

  return (
    <div className="flex h-full w-full bg-gray-5 justify-center">
     
      <img src={bigLogo} width="150" alt="" className='absolute top-10 left-20'/> 
      <div className='mt-auto mb-auto'>
        <SignUp {...props}/>
        
      </div>
      <div className='flex justify-center absolute left-auto right-auto bottom-2'>
          <Link to='/legal' className='no-underline text-gray-80 text-base font-regular mr-4 mt-6'>
            Terms and conditions
          </Link>
          <Link to='/help' className='no-underline text-gray-80 text-base font-regular ml-4 mt-6'>
            Need help?
          </Link>
      </div>
    </div>
  );
};

export default SignUpView;
