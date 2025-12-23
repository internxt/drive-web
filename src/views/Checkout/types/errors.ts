import { STATUS_CODE_ERROR } from '../constants';

export type CheckoutErrorCode = keyof typeof STATUS_CODE_ERROR;

export class CheckoutError extends Error {
  public readonly code: CheckoutErrorCode;
  public readonly status: number;

  constructor(message: string, code: CheckoutErrorCode) {
    super(message);
    this.name = 'CheckoutError';
    this.code = code;
    this.status = STATUS_CODE_ERROR[code];
  }

  static fromHttpStatus(status: number, message: string): CheckoutError {
    const codeEntry = Object.entries(STATUS_CODE_ERROR).find(([, value]) => value === status);
    const code = (codeEntry?.[0] as CheckoutErrorCode) ?? 'INTERNAL_SERVER_ERROR';
    return new CheckoutError(message, code);
  }

  static isCheckoutError(error: unknown): error is CheckoutError {
    return error instanceof CheckoutError;
  }

  isUserExists(): boolean {
    return this.code === 'USER_EXISTS';
  }

  isCouponNotValid(): boolean {
    return this.code === 'COUPON_NOT_VALID';
  }

  isPromoCodeNotFound(): boolean {
    return this.code === 'PROMO_CODE_BY_NAME_NOT_FOUND';
  }

  isBadRequest(): boolean {
    return this.code === 'BAD_REQUEST';
  }

  isServerError(): boolean {
    return this.code === 'INTERNAL_SERVER_ERROR';
  }
}
