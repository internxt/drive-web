import { TimeInterval } from '../models/enums';

enum CurrencySymbol {
  EUR = '€',
}

function getMonthCount(intervalCount: number, timeInterval: TimeInterval) {
  const byTimeIntervalCalculator: { [key in TimeInterval]: () => number } = {
    [TimeInterval.Month]: () => intervalCount,
    [TimeInterval.Year]: () => intervalCount * 12,
  };

  return byTimeIntervalCalculator[timeInterval]();
}

const moneyService = {
  getCurrencySymbol(currency: string): string {
    return CurrencySymbol[currency.toUpperCase()];
  },
  getMonthlyPrice(totalPrice: number, intervalCount: number, timeInterval: TimeInterval): number {
    const monthCount = getMonthCount(intervalCount, timeInterval);
    const monthlyPrice = totalPrice / monthCount;

    return monthlyPrice;
  },
};

export default moneyService;
