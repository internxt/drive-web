import React from 'react';
import { ReactComponent as Check } from './Check.svg';
import { ReactComponent as Minus } from './Minus.svg';

interface BaseCheckboxProps {
  id?: string;
  checked?: boolean;
  indeterminate?: boolean;
  onClick?: React.DOMAttributes<HTMLLabelElement>['onClick'];
  required?: boolean;
  className?: string;
  checkboxDataCy?: string;
}

const BaseCheckbox = ({
  id,
  checked,
  indeterminate,
  onClick,
  required,
  className,
  checkboxDataCy,
}: BaseCheckboxProps): JSX.Element => {
  return (
    <label
      className={`relative h-5 w-5 rounded focus-within:outline-primary ${className}`}
      onClick={onClick}
      onKeyDown={() => {}}
    >
      <div
        onClick={(e) => e.preventDefault()}
        data-cy={checkboxDataCy}
        onKeyDown={() => {}}
        className={`relative flex h-5 w-5 cursor-pointer flex-col items-center justify-center rounded border text-white ${
          indeterminate || checked ? 'border-primary bg-primary' : 'border-gray-30 hover:border-gray-40'
        }`}
      >
        {indeterminate ? <Minus className="absolute -inset-px" /> : checked && <Check className="absolute -inset-px" />}
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

export default BaseCheckbox;
