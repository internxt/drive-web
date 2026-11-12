import { useMemo, useState } from 'react';
import { MonthKey, PhotoMonth } from '../types';
import { getUniqueMonthKeysNewestFirst } from '../utils/monthKeys';

export type PhotoFilters = ReturnType<typeof usePhotoFilters>;

export const usePhotoFilters = (months: PhotoMonth[]) => {
  const [selectedDeviceUuid, setSelectedDeviceUuid] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey | null>(null);

  const monthsOfSelectedDevices = useMemo(
    () => (selectedDeviceUuid ? months.filter((month) => month.deviceUuid === selectedDeviceUuid) : months),
    [months, selectedDeviceUuid],
  );

  const availableMonths = useMemo(
    () => getUniqueMonthKeysNewestFirst(monthsOfSelectedDevices),
    [monthsOfSelectedDevices],
  );

  const shownMonths = useMemo(
    () =>
      selectedMonth ? monthsOfSelectedDevices.filter((month) => month.key === selectedMonth) : monthsOfSelectedDevices,
    [monthsOfSelectedDevices, selectedMonth],
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
