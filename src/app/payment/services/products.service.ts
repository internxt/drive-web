import envService from '../../core/services/env.service';
import httpService from '../../core/services/http.service';
import { ProductData } from '../types';

export const fetchProducts = async (): Promise<ProductData[]> => {
  return httpService.get<ProductData[]>(`/api/v3/stripe/products${envService.isProduction() ? '' : '?test=true'}`);
};
