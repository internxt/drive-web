import { beforeEach, afterAll, beforeAll, describe, expect, it, vi, Mock } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import ShareGuestSingUpView from './ShareGuestSingUpView';
import { userActions } from 'app/store/slices/user';
import * as keysService from 'app/crypto/services/keys.service';
import { encryptTextWithKey } from 'app/crypto/services/utils';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import { Buffer } from 'buffer';
import { generateMnemonic } from 'bip39';

const originalEnv = process.env.REACT_APP_CRYPTO_SECRET;
const originalSalt = process.env.REACT_APP_MAGIC_SALT;
const originalIV = process.env.REACT_APP_MAGIC_IV;
const originalURL = process.env.REACT_APP_API_URL;
const originalHostName = process.env.REACT_APP_HOSTNAME;

const mockPassword = 'mock-password';
const mockEmal = 'mock@email.com';
const mockToken = 'mock-token';
let callCount = 0;

describe('onSubmit', () => {
  beforeAll(() => {
    process.env.REACT_APP_CRYPTO_SECRET = '123456789QWERTY';
    process.env.REACT_APP_MAGIC_IV = '12345678912345678912345678912345';
    process.env.REACT_APP_MAGIC_SALT =
      '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    process.env.REACT_APP_API_URL = 'https://mock';
    process.env.REACT_APP_HOSTNAME = 'hostname';
    globalThis.Buffer = Buffer;

    vi.spyOn(globalThis, 'decodeURIComponent').mockImplementation((value) => {
      return value;
    });

    vi.mock('app/core/services/local-storage.service', () => ({
      default: {
        get: vi.fn(),
        clear: vi.fn(),
        getUser: vi.fn(),
        set: vi.fn(),
      },
    }));

    vi.mock('@internxt/lib/dist/src/auth/testPasswordStrength', () => ({
      testPasswordStrength: vi.fn(),
    }));

    vi.mock('react-helmet-async', () => ({
      Helmet: vi.fn(),
    }));

    vi.mock('@phosphor-icons/react', () => ({
      Info: () => <div>Mocked Info Icon</div>,
      WarningCircle: () => <div>Mocked Warning Circle Icon</div>,
      CheckCircle: () => <div>Mocked Check Circle Icon</div>,
      Eye: () => <div>Mocked Eye Icon</div>,
      EyeSlash: () => <div>Mocked Eye Slash Icon</div>,
      MagnifyingGlass: () => <div>Mocked Magnifyin Glass Icon</div>,
      Warning: () => <div>Mocked Warning Icon</div>,
      WarningOctagon: () => <div>Mocked Warning Octagon Icon</div>,
      X: () => <div>Mocked X Icon</div>,
    }));

    vi.mock('app/auth/components/PasswordInput/PasswordInput', () => {
      return {
        __esModule: true,
        default: vi.fn(({ register, ...props }) => (
          <input
            data-testid="password-input"
            type="password"
            placeholder={props.placeholder}
            className={props.className}
            onFocus={props.onFocus}
            maxLength={props.maxLength}
            ref={register}
          />
        )),
      };
    });

    vi.mock('app/auth/components/SignUp/SignUp', () => ({
      Views: vi.fn(),
    }));

    vi.mock('app/auth/components/SignUp/useSignUp', () => ({
      useSignUp: vi.fn().mockReturnValue({ doRegisterPreCreatedUser: vi.fn() }),
      parseUserSettingsEnsureKyberKeysAdded: vi.importActual,
    }));

    vi.mock('app/shared/components/PasswordStrengthIndicator', () => ({
      default: {
        PasswordStrengthIndicator: () => <div>Mocked Password Strength Indicator</div>,
      },
    }));

    vi.mock('app/auth/services/auth.service', () => ({
      getNewToken: vi.fn(),
    }));

    vi.mock('app/core/services/error.service', () => ({
      default: {
        castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
        reportError: vi.fn(),
      },
    }));

    vi.mock('app/share/services/share.service', () => ({
      default: {
        shareService: {
          validateSharingInvitation: vi.fn(),
        },
      },
    }));

    vi.mock('app/core/services/navigation.service', () => ({
      default: {
        push: vi.fn(),
        history: {
          location: {
            search: { email: 'mock@email.com' },
          },
        },
      },
    }));

    vi.mock('app/core/types', () => ({
      AppView: {
        Drive: vi.fn(),
        Signup: vi.fn(),
      },
      IFormValues: vi.fn(),
    }));

    vi.mock('app/i18n/provider/TranslationProvider', () => ({
      useTranslationContext: vi.fn().mockReturnValue({
        translate: vi.fn().mockImplementation((value: string) => {
          return value;
        }),
      }),
    }));

    vi.mock('app/shared/views/ExpiredLink/ExpiredLinkView', () => ({
      default: {
        ExpiredLink: vi.fn(),
      },
    }));

    vi.mock('query-string', () => ({
      parse: vi.fn().mockImplementation((input: string) => input),
    }));

    vi.mock('react', () => {
      return {
        useEffect: vi.fn(),
        useState: vi.fn().mockImplementation((initial) => {
          callCount++;
          const value = callCount === 1 ? true : false;
          if (initial === false) initial = value;
          if (
            initial &&
            typeof initial === 'object' &&
            'isLoading' in initial &&
            'isValid' in initial &&
            initial.isLoading === true &&
            initial.isValid === false
          ) {
            initial = { isLoading: false, isValid: true };
          }
          const setState = vi.fn().mockImplementation((newState) => {
            return { ...initial, ...newState };
          });

          return [initial, setState];
        }),
        createElement: vi.fn(),
      };
    });

    vi.mock('react-hook-form', () => ({
      SubmitHandler: vi.fn(),
      useForm: () => {
        const mockValues = { email: mockEmal, token: mockToken, password: mockPassword };

        return {
          register: vi.fn(),
          handleSubmit: vi.fn().mockImplementation((fn) => {
            return (event) => {
              event?.preventDefault();
              fn(mockValues);
            };
          }),
          formState: { errors: {}, isValid: true },
          control: vi.fn(),
          watch: vi.fn((name) => mockValues[name]),
        };
      },
      useWatch: vi.fn(),
    }));

    vi.mock('react-redux', () => ({
      useSelector: vi.fn(),
      useDispatch: vi.fn(() => vi.fn()),
    }));

    vi.mock('../../utils', () => ({
      onChangePasswordHandler: vi.fn(),
    }));

    vi.mock('app/core/services/workspace.service', () => ({
      default: {
        validateWorkspaceInvitation: vi.fn().mockImplementation(() => {
          return true;
        }),
      },
    }));

    vi.mock('app/store/hooks', () => ({
      useAppDispatch: vi.fn().mockReturnValue(vi.fn()),
    }));

    vi.mock('app/store/slices/plan', () => ({
      planThunks: {
        initializeThunk: vi.fn(),
      },
    }));
    vi.mock('app/store/slices/products', () => ({
      productsThunks: {
        initializeThunk: vi.fn(),
      },
    }));

    vi.mock('app/store/slices/referrals', () => ({
      referralsThunks: {
        initializeThunk: vi.fn(),
      },
    }));

    vi.mock('app/store/slices/user', () => ({
      initializeUserThunk: vi.fn(),
      userActions: {
        setUser: vi.fn(),
      },
      userThunks: {
        initializeUserThunk: vi.fn(),
      },
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env.REACT_APP_CRYPTO_SECRET = originalEnv;
    process.env.REACT_APP_MAGIC_SALT = originalSalt;
    process.env.REACT_APP_MAGIC_IV = originalIV;
    process.env.REACT_APP_API_URL = originalURL;
    process.env.REACT_APP_HOSTNAME = originalHostName;
  });

  it('when called with new valid data, then user with decypted keys is saved in local storage', async () => {
    const mockMnemonic = generateMnemonic(256);
    const keys = await keysService.getKeys(mockPassword);
    const encryptedMockMnemonic = encryptTextWithKey(mockMnemonic, mockPassword);
    const creationDate = new Date();

    const mockUser: UserSettings = {
      uuid: 'mock-uuid',
      email: mockEmal,
      privateKey: keys.ecc.privateKeyEncrypted,
      mnemonic: encryptedMockMnemonic,
      userId: 'mock-userId',
      name: 'mock-name',
      lastname: 'mock-lastname',
      username: 'mock-username',
      bridgeUser: 'mock-bridgeUser',
      bucket: 'mock-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'mock-rootFolderId',
      rootFolderUuid: undefined,
      sharedWorkspace: false,
      credit: 0,
      publicKey: keys.ecc.publicKey,
      revocationKey: keys.revocationCertificate,
      keys: {
        ecc: {
          publicKey: keys.ecc.publicKey,
          privateKey: keys.ecc.privateKeyEncrypted,
        },
        kyber: {
          publicKey: keys.kyber.publicKey ?? '',
          privateKey: keys.kyber.privateKeyEncrypted ?? '',
        },
      },
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: creationDate,
      avatar: null,
      emailVerified: false,
    };

    callCount = 0;

    (useSignUp as Mock).mockImplementation(() => ({
      doRegisterPreCreatedUser: vi.fn().mockResolvedValue({
        xUser: mockUser,
        xToken: mockToken,
        mnemonic: mockMnemonic,
      }),
    }));

    const spy = vi.spyOn(userActions, 'setUser').mockImplementation((user) => {
      return {
        payload: user,
        type: 'user/setUser',
      };
    });
    render(<ShareGuestSingUpView />);
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);
    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    const decryptedPrivateKey = keysService.decryptPrivateKey(keys.ecc.privateKeyEncrypted, mockPassword);

    let decryptedPrivateKyberKey = '';
    if (keys.kyber.privateKeyEncrypted)
      decryptedPrivateKyberKey = keysService.decryptPrivateKey(keys.kyber.privateKeyEncrypted, mockPassword);

    const mockClearUser: UserSettings = {
      uuid: 'mock-uuid',
      email: 'mock@email.com',
      privateKey: Buffer.from(decryptedPrivateKey).toString('base64'),
      mnemonic: encryptedMockMnemonic,
      userId: 'mock-userId',
      name: 'mock-name',
      lastname: 'mock-lastname',
      username: 'mock-username',
      bridgeUser: 'mock-bridgeUser',
      bucket: 'mock-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'mock-rootFolderId',
      rootFolderUuid: undefined,
      sharedWorkspace: false,
      credit: 0,
      publicKey: keys.ecc.publicKey,
      revocationKey: keys.revocationCertificate,
      keys: {
        ecc: {
          publicKey: keys.ecc.publicKey,
          privateKey: Buffer.from(decryptedPrivateKey).toString('base64'),
        },
        kyber: {
          publicKey: keys.kyber.publicKey ?? '',
          privateKey: decryptedPrivateKyberKey,
        },
      },
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: creationDate,
      avatar: null,
      emailVerified: false,
    };
    expect(spy).toBeCalledWith(mockClearUser);
  });

  it('when called with old valid data, then user with decypted keys is saved in local storage', async () => {
    const mockMnemonic = generateMnemonic(256);
    const keys = await keysService.getKeys(mockPassword);
    const encryptedMockMnemonic = encryptTextWithKey(mockMnemonic, mockPassword);
    const creationDate = new Date();

    const mockUser: Partial<UserSettings> = {
      uuid: 'mock-uuid',
      email: mockEmal,
      privateKey: keys.ecc.privateKeyEncrypted,
      mnemonic: encryptedMockMnemonic,
      userId: 'mock-userId',
      name: 'mock-name',
      lastname: 'mock-lastname',
      username: 'mock-username',
      bridgeUser: 'mock-bridgeUser',
      bucket: 'mock-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'mock-rootFolderId',
      rootFolderUuid: undefined,
      sharedWorkspace: false,
      credit: 0,
      publicKey: keys.ecc.publicKey,
      revocationKey: keys.revocationCertificate,
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: creationDate,
      avatar: null,
      emailVerified: false,
    };

    callCount = 0;

    (useSignUp as Mock).mockImplementation(() => ({
      doRegisterPreCreatedUser: vi.fn().mockResolvedValue({
        xUser: mockUser as UserSettings,
        xToken: mockToken,
        mnemonic: mockMnemonic,
      }),
    }));

    const spy = vi.spyOn(userActions, 'setUser').mockImplementation((user) => {
      return {
        payload: user,
        type: 'user/setUser',
      };
    });
    render(<ShareGuestSingUpView />);
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);
    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    const decryptedPrivateKey = keysService.decryptPrivateKey(keys.ecc.privateKeyEncrypted, mockPassword);

    const mockClearUser: UserSettings = {
      uuid: 'mock-uuid',
      email: 'mock@email.com',
      privateKey: Buffer.from(decryptedPrivateKey).toString('base64'),
      mnemonic: encryptedMockMnemonic,
      userId: 'mock-userId',
      name: 'mock-name',
      lastname: 'mock-lastname',
      username: 'mock-username',
      bridgeUser: 'mock-bridgeUser',
      bucket: 'mock-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'mock-rootFolderId',
      rootFolderUuid: undefined,
      sharedWorkspace: false,
      credit: 0,
      publicKey: keys.ecc.publicKey,
      revocationKey: keys.revocationCertificate,
      keys: {
        ecc: {
          publicKey: keys.ecc.publicKey,
          privateKey: Buffer.from(decryptedPrivateKey).toString('base64'),
        },
        kyber: {
          publicKey: '',
          privateKey: '',
        },
      },
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: creationDate,
      avatar: null,
      emailVerified: false,
    };
    expect(spy).toBeCalledWith(mockClearUser);
  });
});
