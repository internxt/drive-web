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

  const shownMonthKey = selectedMonth ?? availableMonths[0];

  const shownMonths = useMemo(
    () => monthsOfSelectedDevices.filter((month) => month.key === shownMonthKey),
    [monthsOfSelectedDevices, shownMonthKey],
  );

  const selectDevice = (deviceUuid: string | null) => {
    setSelectedDeviceUuid(deviceUuid);
    setSelectedMonth(null);
  };

  return {
    selectedDeviceUuid,
    selectDevice,
    availableMonths,
    selectedMonth,
    selectMonth: setSelectedMonth,
    shownMonths,
  };
};
