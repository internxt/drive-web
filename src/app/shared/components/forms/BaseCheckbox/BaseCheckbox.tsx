import { Path, UseFormRegister } from 'react-hook-form';
import { IFormValues } from 'app/core/types';

interface BaseCheckboxProps {
  label: Path<IFormValues>;
  register: UseFormRegister<IFormValues>;
  required: boolean;
  text: string;
  additionalStyling?: string;
}

const BaseCheckbox = ({ label, register, required, text, additionalStyling }: BaseCheckboxProps): JSX.Element => {
  return (
    <label className={`flex w-max items-center cursor-pointer mt-2 mb-3.5 ${additionalStyling}`}>
      <input
        type="checkbox"
        placeholder="Remember me"
        {...register(label, { required })}
        className="hover:bg-blue-20"
      />
      <span className="text-sm text-neutral-500 ml-3 select-none">{text}</span>
    </label>
  );
};

export default BaseCheckbox;
