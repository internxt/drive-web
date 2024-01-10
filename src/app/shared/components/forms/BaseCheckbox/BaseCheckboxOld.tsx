import { Path, UseFormRegister } from 'react-hook-form';
import { IFormValues } from 'app/core/types';

interface BaseCheckboxProps {
  label: Path<IFormValues>;
  register: UseFormRegister<IFormValues>;
  required: boolean;
  text: string;
  additionalStyling?: string;
}

const BaseCheckboxOld = ({ label, register, required, text, additionalStyling }: BaseCheckboxProps): JSX.Element => {
  return (
    <label className={`mb-3.5 mt-2 flex w-max cursor-pointer items-center ${additionalStyling}`}>
      <input
        type="checkbox"
        placeholder="Remember me"
        {...register(label, { required })}
        className="hover:bg-primary/20"
      />
      <span className="ml-3 select-none text-sm text-gray-70">{text}</span>
    </label>
  );
};

export default BaseCheckboxOld;
