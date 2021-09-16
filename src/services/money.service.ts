enum CurrencySymbol {
  EUR = '€',
  USD = '$',
}

const moneyService = {
  getCurrencySymbol(currency: string): string {
    return currency ? CurrencySymbol[currency.toUpperCase()] : CurrencySymbol.EUR;
  },
};

export default moneyService;
