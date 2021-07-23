import { getHeaders } from '../lib/auth';
import { IStripeProduct } from '../models/interfaces';

export const loadAvailableProducts = async (): Promise<IStripeProduct[]> => {
  console.log('before fetch');
  const response = await fetch('/api/stripe/products' + (process.env.NODE_ENV !== 'production' ? '?test=true' : ''), {
    headers: getHeaders(true, false)
  });
  const data = await response.json();

  console.log('products =>', data);
  return data;
};

export const loadAvailablePlans = async (product: IStripeProduct): Promise<any> => {
  const body = { product, test: product.test };

  if (process.env.NODE_ENV !== 'production') {
    body.test = true;
  }
  const response = await fetch('/api/stripe/plans', {
    method: 'post',
    headers: getHeaders(true, false),
    body: JSON.stringify(body)
  });
  const data = await response.json();

  console.log('plans =>', data);
  return data;
};