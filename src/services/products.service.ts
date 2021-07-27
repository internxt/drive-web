import { getHeaders } from '../lib/auth';
import { IStripeCustomer, IStripePlan, IStripeProduct } from '../models/interfaces';
import analyticsService from './analytics.service';

export const loadAvailableProducts = async (): Promise<IStripeProduct[]> => {
  const test = false;
  const response = await fetch('/api/stripe/products' + (process.env.NODE_ENV !== 'production' ? '?test=true' : ''), {
    headers: getHeaders(true, false)
  });
  const data = await response.json();

  console.log('products =>', data);
  return data;
};

export const loadAvailablePlans = async (product: IStripeProduct): Promise<IStripePlan[]> => {
  const body = { product: product.id, test: product.test };

  if (process.env.NODE_ENV !== 'production') {
    body.test = false;
  }
  const response = await fetch('/api/stripe/plans', {
    method: 'post',
    headers: getHeaders(true, false),
    body: JSON.stringify(body)
  });
  const data = await response.json();

  return data;
};

export const loadAllStripeCustomers = async (email: string): Promise<IStripeCustomer> => {
  const response = await fetch(`/api/stripe/v1/customers/${email}`, {
    headers: getHeaders(true, false)
  });
  const data = await response.json();

  return data;
};

export const payStripePlan = async (body): Promise<any> => {
  const response = await fetch('/api/stripe/session', {
    method: 'POST',
    headers: getHeaders(true, false),
    body: JSON.stringify(body)
  });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};