import { useEffect, useMemo, useState } from 'react';
import { OFFER_COUNTDOWN_DURATION_MS, OFFER_COUNTDOWN_STORAGE_KEY } from '../constants';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const readStoredDeadline = (): number | null => {
  try {
    const storedDeadline = Number(globalThis.sessionStorage?.getItem(OFFER_COUNTDOWN_STORAGE_KEY));

    return Number.isFinite(storedDeadline) && storedDeadline > 0 ? storedDeadline : null;
  } catch {
    return null;
  }
};

const storeDeadline = (deadline: number): void => {
  try {
    globalThis.sessionStorage?.setItem(OFFER_COUNTDOWN_STORAGE_KEY, String(deadline));
  } catch {
    return;
  }
};

const getDeadline = (durationMs: number): number => {
  const storedDeadline = readStoredDeadline();

  if (storedDeadline && storedDeadline > Date.now()) {
    return storedDeadline;
  }

  const deadline = Date.now() + durationMs;
  storeDeadline(deadline);

  return deadline;
};

const getRemainingMs = (deadline: number): number => Math.max(0, deadline - Date.now());

const padTimeUnit = (value: number): string => String(value).padStart(2, '0');

export interface OfferCountdown {
  hours: string;
  minutes: string;
  seconds: string;
  hasExpired: boolean;
}

export const useOfferCountdown = (durationMs: number = OFFER_COUNTDOWN_DURATION_MS): OfferCountdown => {
  const deadline = useMemo(() => getDeadline(durationMs), [durationMs]);
  const [remainingMs, setRemainingMs] = useState<number>(() => getRemainingMs(deadline));

  useEffect(() => {
    setRemainingMs(getRemainingMs(deadline));

    const intervalId = setInterval(() => {
      setRemainingMs(getRemainingMs(deadline));
    }, MILLISECONDS_PER_SECOND);

    return () => clearInterval(intervalId);
  }, [deadline]);

  const totalSeconds = Math.ceil(remainingMs / MILLISECONDS_PER_SECOND);

  return {
    hours: padTimeUnit(Math.floor(totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR))),
    minutes: padTimeUnit(Math.floor(totalSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR),
    seconds: padTimeUnit(totalSeconds % SECONDS_PER_MINUTE),
    hasExpired: remainingMs === 0,
  };
};
