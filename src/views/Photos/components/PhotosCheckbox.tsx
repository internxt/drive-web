interface PhotosCheckboxProps {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  className?: string;
  onChange: () => void;
}

const PhotosCheckbox = ({
  label,
  checked,
  indeterminate = false,
  className = '',
  onChange,
}: PhotosCheckboxProps): JSX.Element => (
  <input
    type="checkbox"
    aria-label={label}
    checked={checked}
    ref={(input) => {
      if (input) input.indeterminate = indeterminate;
    }}
    onChange={onChange}
    className={`h-5 w-5 cursor-pointer accent-primary ${className}`}
  />
);

export default PhotosCheckbox;
