import Input from '../../shared/components/Input';

const DetailsInput = ({
  label,
  textValue,
  onChangeTextValue,
  maxLength,
  disabled,
  hideMaxLength,
  variant,
  accent,
  placeholder,
}: {
  label: string;
  textValue: string;
  onChangeTextValue: (text: string) => void;
  maxLength?: number;
  hideMaxLength?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'search' | 'password' | 'email';
  accent?: 'default' | 'error' | 'warning' | 'success';
  placeholder?: string;
}) => {
  return (
    <div className="space-y-1">
      <Input
        label={label}
        placeholder={placeholder}
        value={textValue}
        disabled={disabled}
        className="w-full"
        onChange={onChangeTextValue}
        maxLength={maxLength}
        variant={variant}
        accent={accent}
      />
      {!hideMaxLength && maxLength && (
        <span className="flex w-full justify-end text-sm font-normal leading-4 text-gray-50">
          <text>
            {textValue.length}/{maxLength}
          </text>
        </span>
      )}
    </div>
  );
};

export default DetailsInput;
