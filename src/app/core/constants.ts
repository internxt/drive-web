export const HUNDRED_TB = 109951162777600;
export const HTTP_CODES = {
  MAX_SPACE_USED: 420,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};
export enum ErrorMessages {
  ServerUnavailable = 'Server Unavailable',
  ServerError = 'Server Error',
  InternalServerError = 'Internal Server Error',
  NetworkError = 'Network Error',
  ConnectionLost = 'Connection lost',
  FilePickerCancelled = 'File picker was canceled or failed',
  CORS = 'cors',
}
