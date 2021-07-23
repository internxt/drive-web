import React from 'react';

interface ButtonProps {
  text: string
  onClick: () => void
  additionalStyling?: string
}

const ButtonTextOnly = ({ text, onClick, additionalStyling }: ButtonProps): JSX.Element => {
  return (
    <button className={`transition duration-200 easi-in-out text-center text-sm text-blue-60 underline hover:text-blue-80 hover:underline ml-2 ${additionalStyling}`}
      onClick={() => onClick()}>{text}</button>
  );
};

export default ButtonTextOnly;