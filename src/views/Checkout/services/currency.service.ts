import { CryptoCurrency } from '@internxt/sdk/dist/payments/types';
import { SdkFactory } from 'app/core/factory/sdk';

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

  async getAvailableCryptoCurrencies(): Promise<CryptoCurrency[]> {
    const checkoutClient = await SdkFactory.getNewApiInstance().createCheckoutClient();
    return checkoutClient.getAvailableCryptoCurrencies();
  },
};

export default currencyService;
