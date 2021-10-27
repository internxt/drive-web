import { useState } from 'react';

interface NumberInputProps {
  className?: string;
  initialValue?: number;
  min?: number;
  max?: number;
  unitLabel?: string;
  onChange?: (value: number) => void;
}

const NumberInput = (props: NumberInputProps): JSX.Element => {
  const [value, setValue] = useState(props.initialValue || 0);
  const min = props.min || 0;
  const max = props.max;
  const unitLabel = props.unitLabel || '';
  const onValueChanged = (newValue: number) => {
    let validatedNewValue = newValue;
    validatedNewValue = !newValue || newValue < min ? min : newValue;
    validatedNewValue = max != undefined ? (value > max ? max : value) : validatedNewValue;

    setValue(validatedNewValue);

    props.onChange?.(validatedNewValue);
  };

  return (
    <div
      className={`${
        props.className || ''
      } h-8 relative flex items-center bg-white border border-l-neutral-30 rounded-lg`}
    >
      <button
        disabled={value <= min}
        className="h-full w-10 primary flex items-center justify-center font-semibold rounded-l-lg"
        onClick={() => onValueChanged(value - 1)}
      >
        -
      </button>
      <div className="flex-grow flex items-center justify-center py-1 px-3">
        <input
          type="number"
          min={min}
          max={max}
          className="w-6 mr-1 bg-white"
          value={value}
          onChange={(e) => onValueChanged(parseInt(e.target.value))}
        />
        <span className="text-neutral-500">{unitLabel}</span>
      </div>
      <button
        disabled={max !== undefined && value >= max}
        className="h-full w-10 primary flex items-center justify-center font-semibold rounded-r-lg"
        onClick={() => onValueChanged(value + 1)}
      >
        +
      </button>
    </div>
  );
};

export default NumberInput;
