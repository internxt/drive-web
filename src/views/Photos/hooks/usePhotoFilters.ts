import { useMemo, useState } from 'react';
import { MonthKey, PhotoMonth } from '../types';

export type PhotoFilters = ReturnType<typeof usePhotoFilters>;

export const usePhotoFilters = (months: PhotoMonth[]) => {
  const [selectedDeviceUuid, setSelectedDeviceUuid] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey | null>(null);

  const availableMonths = useMemo(() => {
    const monthsOfSelectedDevices = selectedDeviceUuid
      ? months.filter((month) => month.deviceUuid === selectedDeviceUuid)
      : months;
    const uniqueMonthKeys = new Set(monthsOfSelectedDevices.map((month) => month.key));

    const monthsNewestFirst = [...uniqueMonthKeys].sort((month, otherMonth) => otherMonth.localeCompare(month));

    return monthsNewestFirst;
  }, [months, selectedDeviceUuid]);

  const isSelectedMonthAvailable = selectedMonth !== null && availableMonths.includes(selectedMonth);

  return {
    selectedDeviceUuid,
    selectDevice: setSelectedDeviceUuid,
    availableMonths,
    selectedMonth: isSelectedMonthAvailable ? selectedMonth : null,
    selectMonth: setSelectedMonth,
  };
};
