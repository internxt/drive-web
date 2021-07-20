interface ButtonProps {
  children: JSX.Element[] | string;
  onClick?: () => void;
}

const BaseButton = ({ children, onClick }: ButtonProps): JSX.Element => {
  return (
    <button className="flex items-center justify-center bg-blue-60 py-2 rounded text-white text-sm"
      onClick={() => onClick}
    >
      {children}
    </button>
  );
};

export default BaseButton;