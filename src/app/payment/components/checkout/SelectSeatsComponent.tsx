interface SelectUsersComponentProps {
  disableMinusButton: boolean;
  disablePlusButton: boolean;
  seats: number;
  onUsersChange: (seats: number) => void;
}

const SeparatorVertical = () => <div className="h-max border-[0.5px] border-gray-10 py-1" />;

export const SelectSeatsComponent = ({
  disableMinusButton,
  disablePlusButton,
  seats,
  onUsersChange,
}: SelectUsersComponentProps): JSX.Element => {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      onKeyDown={(e) => {
        e.stopPropagation();
      }}
      className="flex w-max flex-row items-center rounded-lg border"
    >
      <button
        disabled={disableMinusButton}
        onClick={(e) => {
          e.preventDefault();
          onUsersChange(seats - 1);
        }}
        className="flex h-full flex-col items-center justify-center rounded-l-lg px-4 hover:bg-gray-10"
      >
        -
      </button>
      <SeparatorVertical />
      <input
        type="text"
        className="flex w-10 items-center justify-center !rounded-none border-0 text-center !outline-none !ring-0"
        value={seats}
        onChange={(e) => {
          e.preventDefault();
          onUsersChange(Number(e.target.value));
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        onBlur={(e) => {
          e.preventDefault();

          onUsersChange(seats);
        }}
      />
      <SeparatorVertical />
      <button
        disabled={disablePlusButton}
        onClick={(e) => {
          e.preventDefault();
          onUsersChange(seats + 1);
        }}
        className="flex h-full flex-col items-center justify-center rounded-r-lg px-4 hover:bg-gray-10"
      >
        +
      </button>
    </div>
  );
};
