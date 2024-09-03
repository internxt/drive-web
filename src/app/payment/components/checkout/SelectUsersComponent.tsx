import { useState } from 'react';

interface SelectUsersComponentProps {
  disableMinusButton: boolean;
  disablePlusButton: boolean;
  onUsersChange: (users: number) => void;
}

const SeparatorVertical = () => <div className="h-max border-[0.5px] border-gray-10 py-1" />;

export const SelectUsersComponent = ({
  disableMinusButton,
  disablePlusButton,
  onUsersChange,
}: SelectUsersComponentProps) => {
  const [totalUsers, setTotalUsers] = useState<number>(3);

  return (
    <div
      onKeyDown={(e) => {
        e.stopPropagation();
      }}
      className="flex w-max flex-row items-center rounded-lg border"
    >
      <button
        disabled={disableMinusButton}
        onClick={(e) => {
          e.preventDefault();
          onUsersChange(totalUsers - 1);
          setTotalUsers(totalUsers - 1);
        }}
        className="flex h-full flex-col items-center justify-center rounded-l-lg px-4 hover:bg-gray-10"
      >
        -
      </button>
      <SeparatorVertical />
      <input
        type="number"
        className="flex w-10 items-center justify-center !rounded-none border-0 text-center !outline-none !ring-0"
        value={totalUsers}
        min={3}
        max={10}
        onChange={(e) => {
          e.preventDefault();
          setTotalUsers(Number(e.target.value));
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        onBlur={(e) => {
          e.preventDefault();
          const users = Number(totalUsers);
          if (users < 3) {
            onUsersChange(3);
            setTotalUsers(3);
          } else if (users > 10) {
            onUsersChange(10);
            setTotalUsers(10);
          } else {
            onUsersChange(totalUsers);
          }
        }}
      />
      <SeparatorVertical />
      <button
        disabled={disablePlusButton}
        onClick={(e) => {
          e.preventDefault();
          setTotalUsers(totalUsers + 1);
          onUsersChange(totalUsers + 1);
        }}
        className="flex h-full flex-col items-center justify-center rounded-r-lg px-4 hover:bg-gray-10"
      >
        +
      </button>
    </div>
  );
};
