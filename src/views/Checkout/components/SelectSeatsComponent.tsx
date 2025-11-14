import { useState } from 'react';
import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface SelectUsersComponentProps {
  maxSeats: number;
  minSeats: number;
  seats: number;
  onSeatsChange: (seats: number) => void;
}

const SeparatorVertical = () => <div className="h-max border-[0.5px] border-gray-10 py-1" />;

export const SelectSeatsComponent = ({
  maxSeats,
  minSeats,
  seats,
  onSeatsChange,
}: SelectUsersComponentProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [totalUsers, setTotalUsers] = useState<number>(seats);
  const [disableApplyButton, setDisableApplyButton] = useState<boolean>(true);
  const disableMinus = totalUsers <= minSeats;
  const disableMax = totalUsers >= maxSeats;

  const onApplySelectedSeats = () => {
    onSeatsChange(totalUsers);
    setDisableApplyButton(true);
  };

  const onTotalSeatsChange = (totalUsers: number) => {
    setDisableApplyButton(false);
    setTotalUsers(totalUsers);
  };

  return (
    <div className="flex flex-row gap-4">
      <div
        role="menuitem"
        tabIndex={0}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        className="flex w-max flex-row items-center rounded-lg border"
      >
        <button
          disabled={disableMinus}
          onClick={(e) => {
            e.preventDefault();
            onTotalSeatsChange(totalUsers - 1);
          }}
          className="flex h-full flex-col items-center justify-center rounded-l-lg px-4 hover:bg-gray-10"
        >
          -
        </button>
        <SeparatorVertical />
        <input
          type="text"
          className="flex w-16 items-center justify-center !rounded-none border-0 text-center !outline-none !ring-0"
          maxLength={3}
          value={totalUsers}
          onChange={(e) => {
            e.preventDefault();
            setDisableApplyButton(false);
            setTotalUsers(Number(e.target.value));
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            setDisableApplyButton(false);
            if (e.key === 'Enter') {
              e.preventDefault();
              onApplySelectedSeats();
            }
          }}
        />
        <SeparatorVertical />
        <button
          disabled={disableMax}
          onClick={(e) => {
            e.preventDefault();
            onTotalSeatsChange(totalUsers + 1);
          }}
          className="flex h-full flex-col items-center justify-center rounded-r-lg px-4 hover:bg-gray-10"
        >
          +
        </button>
      </div>
      <Button
        className="w-max"
        disabled={
          disableApplyButton || (maxSeats && minSeats ? maxSeats < totalUsers || totalUsers < minSeats : undefined)
        }
        type="button"
        variant="primary"
        onClick={onApplySelectedSeats}
      >
        <p>{translate('checkout.productCard.apply')}</p>
      </Button>
    </div>
  );
};
