const Checkbox = ({
  id,
  checked,
  indeterminate,
  onClick,
  required,
  className,
  rounded,
}: {
  id: string;
  checked: boolean;
  indeterminate?: boolean;
  onClick?: () => void;
  required?: boolean;
  className?: string;
  rounded?: string;
}): JSX.Element => {
  return (
    <label
      className={`focus-within:outline-primary relative h-5 w-5 ${rounded ? rounded : 'rounded'} ${className}`}
      onClick={onClick}
    >
      <div
        onClick={(e) => e.preventDefault()}
        className={`relative flex h-5 w-5 cursor-pointer flex-col items-center justify-center rounded-full border bg-white p-1 text-white ${
          indeterminate || checked ? 'border-primary bg-primary' : 'border-gray-30 hover:border-gray-40'
        }`}
      >
        {checked && (
          <div
            className={`flex h-3 w-2.5 cursor-pointer flex-col items-center justify-center rounded-full border bg-white text-white ${
              checked && 'bg-white'
            }`}
          />
        )}
      </div>
      <input
        id={id}
        checked={checked}
        type="checkbox"
        required={required ?? false}
        readOnly
        className="base-checkbox h-0 w-0 appearance-none opacity-0"
      />
    </label>
  );
};

export default Checkbox;
