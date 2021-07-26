interface ButtonProps {
  children: JSX.Element[] | string;
  disabled?: boolean;
  onClick?: () => void;
}

const BaseButton = ({ children, disabled, onClick }: ButtonProps): JSX.Element => {
  return (
    <button
      className="flex items-center justify-center bg-blue-60 py-2 rounded text-white text-sm"
      disabled={!!disabled}
      onClick={() => onClick}
    >
      {children}
    </button>
  );
};

export default BaseButton;