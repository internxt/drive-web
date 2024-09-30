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
    <div className={`${props.className || ''} relative flex h-8 items-center rounded-lg border border-gray-5 bg-white`}>
      <button
        disabled={value <= min}
        className="primary flex h-full w-10 items-center justify-center rounded-l-lg font-semibold"
        onClick={() => onValueChanged(value - 1)}
      >
        -
      </button>
      <div className="flex grow items-center justify-center px-3 py-1">
        <input
          type="number"
          min={min}
          max={max}
          className="input-number mr-1 w-6 bg-white"
          value={value}
          onChange={(e) => onValueChanged(parseInt(e.target.value))}
        />
        <span className="text-gray-70">{unitLabel}</span>
      </div>
      <button
        disabled={max !== undefined && value >= max}
        className="primary flex h-full w-10 items-center justify-center rounded-r-lg font-semibold"
        onClick={() => onValueChanged(value + 1)}
      >
        +
      </button>
    </div>
  );
};

export default NumberInput;
