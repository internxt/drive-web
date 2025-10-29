interface VerticalDividerProps {
  className?: string;
}

const VerticalDivider = ({ className }: VerticalDividerProps): JSX.Element => {
  return (
    <div className={`flex h-auto items-center justify-center ${className}`}>
      <div className="h-full w-px bg-gray-10" />
    </div>
  );
};

export default VerticalDivider;
