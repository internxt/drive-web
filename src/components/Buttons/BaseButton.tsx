interface ButtonProps {
  classes?: string;
  children: JSX.Element[] | string;
  disabled?: boolean;
  onClick?: () => void;
}

const BaseButton = ({ classes, children, disabled, onClick }: ButtonProps): JSX.Element => {
  const className: string = `flex items-center justify-center py-2 rounded text-sm ${classes || ''}`;

  return (
    <button
      className={className}
      disabled={!!disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default BaseButton;