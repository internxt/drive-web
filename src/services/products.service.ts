import { ProductData } from '../models/interfaces';
import envService from './env.service';
import httpService from './http.service';

export const fetchProducts = async (): Promise<ProductData[]> => {
  return httpService.get<ProductData[]>(`/api/v3/stripe/products${envService.isProduction() ? '' : '?test=true'}`);
};
