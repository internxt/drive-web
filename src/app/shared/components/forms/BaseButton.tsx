import { Loader } from '@internxt/ui';
interface ButtonProps {
  className?: string;
  children: JSX.Element | JSX.Element[] | string;
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const BaseButton = ({ className, children, disabled, isLoading, onClick }: ButtonProps): JSX.Element => {
  return (
    <button
      className={`base-button flex items-center justify-center rounded-lg py-1.5 text-base transition-all duration-75 ease-in-out ${
        className || ''
      } ${isLoading && 'cursor-not-allowed'}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {isLoading && <Loader />}
    </button>
  );
};

export default BaseButton;
