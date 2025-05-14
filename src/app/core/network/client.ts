import createClient from 'openapi-fetch';
import { paths } from './schema';

export const client = createClient<paths>({
  baseUrl: process.env.REACT_APP_DRIVE_NEW_API_URL,
});
