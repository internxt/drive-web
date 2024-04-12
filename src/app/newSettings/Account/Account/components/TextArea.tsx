const TextArea = ({ placeholder, value, onChangeValue, disabled, rows, maxCharacters }) => {
  return (
    <div>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChangeValue(String(e.target.value))}
        rows={rows}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-gray-20 bg-transparent p-3 pl-4 text-lg font-normal text-gray-80 disabled:text-gray-40 disabled:placeholder-gray-20"
        maxLength={maxCharacters}
      />
      <span className="flex w-full justify-end text-sm font-normal leading-4 text-gray-50">
        <text>
          {value.length}/{maxCharacters}
        </text>
      </span>
    </div>
  );
};

export default TextArea;
