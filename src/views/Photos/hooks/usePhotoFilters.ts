import { useMemo, useState } from 'react';
import { MonthKey, PhotoMonth } from '../types';

export type PhotoFilters = ReturnType<typeof usePhotoFilters>;

export const usePhotoFilters = (months: PhotoMonth[]) => {
  const [selectedDeviceUuid, setSelectedDeviceUuid] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey | null>(null);

  const monthsOfSelectedDevices = useMemo(
    () => (selectedDeviceUuid ? months.filter((month) => month.deviceUuid === selectedDeviceUuid) : months),
    [months, selectedDeviceUuid],
  );

  const availableMonths = useMemo(() => {
    const uniqueMonthKeys = new Set(monthsOfSelectedDevices.map((month) => month.key));
    const monthsNewestFirst = [...uniqueMonthKeys].sort((month, otherMonth) => otherMonth.localeCompare(month));

    return monthsNewestFirst;
  }, [monthsOfSelectedDevices]);

  const isSelectedMonthAvailable = selectedMonth !== null && availableMonths.includes(selectedMonth);

  const shownMonths = useMemo(
    () =>
      isSelectedMonthAvailable
        ? monthsOfSelectedDevices.filter((month) => month.key === selectedMonth)
        : monthsOfSelectedDevices,
    [monthsOfSelectedDevices, isSelectedMonthAvailable, selectedMonth],
  );

  return {
    selectedDeviceUuid,
    onSelectDevice: setSelectedDeviceUuid,
    availableMonths,
    selectedMonth: isSelectedMonthAvailable ? selectedMonth : null,
    onSelectMonth: setSelectedMonth,
    shownMonths,
  };
};
