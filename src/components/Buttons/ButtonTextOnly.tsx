import React from 'react';

interface ButtonProps {
  text: string
  onClick: () => void
}

const ButtonTextOnly = ({ text, onClick }: ButtonProps): JSX.Element => {
  return (
    <button className='transition duration-200 easi-in-out text-center text-sm text-blue-60 underline hover:text-blue-80 hover:underline ml-3'
      onClick={() => onClick()}>{text}</button>
  );
};

export default ButtonTextOnly;
