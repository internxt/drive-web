import { getHeaders } from '../lib/auth';
import { IStripePlan, IStripeProduct } from '../models/interfaces';
import envService from './env.service';

export const loadAvailableProducts = async (): Promise<IStripeProduct[]> => {
  const response = await fetch(
    `${process.env.REACT_APP_API_URL}/api/stripe/products` + (envService.isProduction() ? '' : '?test=true'),
    {
      headers: getHeaders(true, false),
    },
  );
  const data = await response.json();

  return data;
};

export const loadAvailablePlans = async (product: IStripeProduct): Promise<IStripePlan[]> => {
  const body = {
    product: product.id,
    test: envService.isProduction() ? false : true,
  };

  if (envService.isProduction()) {
    body.test = false;
  }
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/stripe/plans`, {
    method: 'post',
    headers: getHeaders(true, false),
    body: JSON.stringify(body),
  });
  const data = await response.json();

  return data;
};

export const loadAvailableTeamsProducts = async (): Promise<IStripeProduct[]> => {
  const queryString = envService.isProduction() ? '' : '?test=true';
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/stripe/teams/products` + queryString, {
    headers: getHeaders(true, false),
  });
  const data = await response.json();

  return data;
};

export const loadAvailableTeamsPlans = async (product: IStripeProduct): Promise<IStripePlan[]> => {
  const body = {
    product: product.id,
    test: envService.isProduction() ? false : true,
  };

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/stripe/teams/plans`, {
    method: 'post',
    headers: getHeaders(true, false),
    body: JSON.stringify(body),
  });
  const data = await response.json();

  return data;
};

export const payStripePlan = async (body): Promise<any> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/stripe/session`, {
    method: 'POST',
    headers: getHeaders(true, false),
    body: JSON.stringify(body),
  });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};
