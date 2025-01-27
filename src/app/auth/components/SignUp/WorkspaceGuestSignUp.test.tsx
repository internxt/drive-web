import { beforeEach, afterAll, beforeAll, describe, expect, it, vi, Mock } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import WorkspaceGuestSingUpView from './WorkspaceGuestSignUp';
import { userActions } from 'app/store/slices/user';
import * as keysService from 'app/crypto/services/keys.service';
import { encryptTextWithKey } from 'app/crypto/services/utils';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';

if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} } as any;
}

const originalEnv = process.env.REACT_APP_CRYPTO_SECRET;
const originalSalt = process.env.REACT_APP_MAGIC_SALT;
const originalIV = process.env.REACT_APP_MAGIC_IV;
const originalURL = process.env.REACT_APP_API_URL;
const originalHostName = process.env.REACT_APP_HOSTNAME;

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
        default: vi.fn((props) => (
          <input
            data-testid="password-input"
            type="password"
            placeholder={props.placeholder}
            className={props.className}
            onFocus={props.onFocus}
            maxLength={props.maxLength}
          />
        )),
      };
    });

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

  vi.mock('app/core/services/local-storage.service', () => ({
    default: {
      get: vi.fn(),
      clear: vi.fn(),
      getUser: vi.fn(),
      set: vi.fn(),
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

  vi.mock('react', () => ({
    useEffect: vi.fn(),
    useState: vi.fn().mockImplementation((initial) => {
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
  }));

  vi.mock('react-hook-form', () => ({
    SubmitHandler: vi.fn(),
    useForm: () => ({
      register: vi.fn(),
      handleSubmit: vi.importActual,
      formState: { errors: {}, isValid: true },
      control: vi.fn(),
    }),
    useWatch: vi.fn(),
  }));

  vi.mock('react-redux', () => ({
    useSelector: vi.fn(),
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

describe('onSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('when called with valid data, then it encrypts data, generates keys, and returns the expected user and token', async () => {
    const mockPassword = 'mock-password';
    const mockMnemonic = bip39.generateMnemonic(256);
    const keys = await keysService.getKeys(mockPassword);
    const encryptedMockMnemonic = encryptTextWithKey(mockMnemonic, mockPassword);

    const mockUser: UserSettings = {
      uuid: 'mock-uuid',
      email: 'mock@email.com',
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
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };
    const mockToken = 'mock-token';

    (useSignUp as Mock).mockImplementation(() => ({
      doRegisterPreCreatedUser: vi.fn().mockResolvedValue({
        xUser: mockUser,
        xToken: mockToken,
        mnemonic: mockMnemonic,
      }),
    }));

    const spy = vi.spyOn(userActions, 'setUser');
    render(<WorkspaceGuestSingUpView />);
    const passwordInput = screen.getByTestId('password-input');
    fireEvent.change(passwordInput, { target: { value: mockPassword} });
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);
    expect(spy).toBeCalled();

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
          privateKey: Buffer.from(decryptedPrivateKyberKey).toString('base64'),
        },
      },
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };
    expect(spy).toBeCalledWith(mockClearUser);
  });
});
