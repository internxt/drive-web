import React from 'react';

const AuthButton = ({ isDisabled, text, textWhenDisabled }: { isDisabled: boolean, text: string, textWhenDisabled: string }): JSX.Element => (
  <button type='submit' className='transition duration-200 easi-in-out flex items-center justify-center bg-blue-60 hover:bg-blue-80 py-2 rounded text-white text-sm'
    disabled={isDisabled}
  >
    <span>{isDisabled ? textWhenDisabled : text}</span>
  </button>
);

export default AuthButton;