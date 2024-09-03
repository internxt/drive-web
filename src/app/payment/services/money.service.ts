enum CurrencySymbol {
  USD = '$', // US Dollar
  EUR = '€', // Euro
  CRC = '₡', // Costa Rican Colón
  GBP = '£', // British Pound Sterling
  ILS = '₪', // Israeli New Sheqel
  INR = '₹', // Indian Rupee
  JPY = '¥', // Japanese Yen
  KRW = '₩', // South Korean Won
  NGN = '₦', // Nigerian Naira
  PHP = '₱', // Philippine Peso
  PLN = 'zł', // Polish Zloty
  PYG = '₲', // Paraguayan Guarani
  THB = '฿', // Thai Baht
  UAH = '₴', // Ukrainian Hryvnia
  VND = '₫', // Vietnamese Dong
}

const currencyService = {
  getCurrencySymbol(currency: string): string {
    return currency ? CurrencySymbol[currency.toUpperCase()] : CurrencySymbol.EUR;
  },
};

export default currencyService;
