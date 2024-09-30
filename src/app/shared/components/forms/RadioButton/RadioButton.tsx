interface RadioButtonProps {
  checked: boolean;
  onClick: () => void;
}

const RadioButton = ({ checked, onClick }: RadioButtonProps) => {
  return (
    <label className="flex cursor-pointer">
      <button
        onClick={onClick}
        className={`flex h-5 w-5 items-center justify-center rounded-full border border-gray-40 ${
          checked && 'border-0 bg-primary'
        }`}
      >
        {checked && <div className="h-2.5 w-2.5 rounded-full bg-white"></div>}
      </button>
      <input type="radio" className="h-0 w-0 appearance-none opacity-0" checked />
    </label>
  );
};

export default RadioButton;
