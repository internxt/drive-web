import Input from '../../shared/components/Input';

const DetailsInput = ({
  label,
  textValue,
  onChangeTextValue,
  maxLength,
  disabled,
}: {
  label: string;
  textValue: string;
  onChangeTextValue: (text: string) => void;
  maxLength?: number;
  disabled?: boolean;
}) => {
  return (
    <div className="space-y-1">
      <Input
        label={label}
        placeholder={textValue}
        value={textValue}
        disabled={disabled}
        className="w-full"
        onChange={onChangeTextValue}
        maxLength={maxLength}
      />
    </div>
  );
};

export default DetailsInput;
