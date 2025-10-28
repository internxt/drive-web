import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import signup from './signup';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import { planThunks } from 'app/store/slices/plan';
import { productsThunks } from 'app/store/slices/products';
import { referralsThunks } from 'app/store/slices/referrals';
import { userActions, userThunks } from 'app/store/slices/user';
import envService from 'app/core/services/env.service';

vi.mock(import('app/core/services/error.service'));
vi.mock(import('app/core/services/local-storage.service'));
vi.mock(import('app/store/slices/plan'));
vi.mock(import('app/store/slices/products'));
vi.mock(import('app/store/slices/referrals'));
vi.mock(import('app/store/slices/user'));
vi.mock(import('app/core/services/env.service'));

describe('signup', () => {
  const mockDispatch = vi.fn();
  const mockDoRegister = vi.fn();
  const mockSetLoading = vi.fn();
  const mockSetError = vi.fn();

  const mockResponse = {
    xUser: { id: '123', email: 'test@example.com' } as Partial<UserSettings>,
    xToken: 'mock-token',
    mnemonic: 'mock-mnemonic',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete globalThis.gtag;
    globalThis.gtag = vi.fn();
    vi.spyOn(globalThis, 'open').mockImplementation(() => null);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    vi.spyOn(globalThis.top!, 'postMessage').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  it('should return early and scroll when email and password are empty', async () => {
    const data = { email: '', password: '' };

    await signup(data, mockDispatch, mockDoRegister, mockSetLoading);

    expect(window.top?.postMessage).toHaveBeenCalledWith({ action: 'autoScroll' }, 'https://www.pccomponentes.com');
    expect(mockSetLoading).toHaveBeenCalledWith(false);
    expect(mockDoRegister).not.toHaveBeenCalled();
  });

  it('should return early when email is null', async () => {
    const data = { email: null, password: 'password' };

    await signup(data, mockDispatch, mockDoRegister, mockSetLoading);

    expect(mockSetLoading).toHaveBeenCalledWith(false);
    expect(mockDoRegister).not.toHaveBeenCalled();
  });

  it('should return early when password is null', async () => {
    const data = { email: 'test@example.com', password: null };

    await signup(data, mockDispatch, mockDoRegister, mockSetLoading);

    expect(mockSetLoading).toHaveBeenCalledWith(false);
    expect(mockDoRegister).not.toHaveBeenCalled();
  });

  it('should successfully register user and initialize store', async () => {
    const data = { email: 'test@example.com', password: 'password123', token: 'token' };
    mockDoRegister.mockResolvedValue(mockResponse);
    vi.mocked(envService.getVariable).mockReturnValue('https://internxt.com');

    await signup(data, mockDispatch, mockDoRegister, mockSetLoading);

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockDoRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'token');
    expect(localStorageService.set).toHaveBeenCalledWith('xToken', 'mock-token');
    expect(localStorageService.set).toHaveBeenCalledWith('xMnemonic', 'mock-mnemonic');
    expect(mockDispatch).toHaveBeenCalledWith(userActions.setUser(mockResponse.xUser as UserSettings));
    expect(mockDispatch).toHaveBeenCalledWith(productsThunks.initializeThunk());
    expect(mockDispatch).toHaveBeenCalledWith(planThunks.initializeThunk());
    expect(mockDispatch).toHaveBeenCalledWith(referralsThunks.initializeThunk());
    expect(mockDispatch).toHaveBeenCalledWith(userThunks.initializeUserThunk());
  });

  it('should track signup event and clean up localStorage', async () => {
    const data = { email: 'test@example.com', password: 'password123', token: 'token' };
    mockDoRegister.mockResolvedValue(mockResponse);
    vi.mocked(envService.getVariable).mockReturnValue('https://internxt.com');

    await signup(data, mockDispatch, mockDoRegister, mockSetLoading);

    expect(globalThis.gtag).toHaveBeenCalledWith('event', 'User Signup', { send_to: 'Blog' });
    expect(localStorage.removeItem).toHaveBeenCalledWith('email');
    expect(localStorage.removeItem).toHaveBeenCalledWith('password');
  });

  it('should open new window with hostname after successful signup', async () => {
    const data = { email: 'test@example.com', password: 'password123', token: 'token' };
    mockDoRegister.mockResolvedValue(mockResponse);
    vi.mocked(envService.getVariable).mockReturnValue('https://internxt.com');

    await signup(data, mockDispatch, mockDoRegister, mockSetLoading);

    expect(window.open).toHaveBeenCalledWith('https://internxt.com', '_parent', 'noopener');
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('should handle registration errors and call setError', async () => {
    const data = { email: 'test@example.com', password: 'password123', token: 'token' };
    const mockError = new Error('Registration failed');
    mockDoRegister.mockRejectedValue(mockError);
    vi.mocked(errorService.castError).mockReturnValue({ message: 'Registration failed' } as Error);

    await signup(data, mockDispatch, mockDoRegister, mockSetLoading, undefined, mockSetError);

    expect(errorService.castError).toHaveBeenCalledWith(mockError);
    expect(mockSetError).toHaveBeenCalledWith('Registration failed');
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});
