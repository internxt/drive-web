import { beforeEach, beforeAll, describe, expect, it, vi, Mock } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import WorkspaceGuestSingUpView from './WorkspaceGuestSignUpView';
import { userActions } from '../../app/store/slices/user';
import * as keysService from '../../app/crypto/services/keys.service';
import { encryptTextWithKey } from '../../app/crypto/services/utils';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSignUp } from './hooks/useSignup';
import { Buffer } from 'node:buffer';
import { generateMnemonic } from 'bip39';
import envService from 'services/env.service';

const mockSecret = '123456789QWERTY';
const mockMagicIv = '12345678912345678912345678912345';
const mockMagicSalt =
  '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const mockApi = 'https://mock';
const mockHostname = 'hostname';

const mockPassword = 'mock-password';
const mockEmal = 'mock@email.com';
const mockToken = 'mock-token';
const mockValues = { email: mockEmal, token: mockToken, password: mockPassword };
let callCount = 0;

const createSetStateMock = (initial: Record<string, unknown>) => {
  return vi.fn().mockImplementation((newState: Record<string, unknown>) => ({ ...initial, ...newState }));
};

const createHandleSubmitMock = (fn: (values: typeof mockValues) => void) => {
  return (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    fn(mockValues);
  };
};

vi.mock('react', () => {
  return {
    useEffect: vi.fn(),
    useState: vi.fn().mockImplementation((initial: unknown) => {
      callCount++;
      const value = callCount === 1;
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
      return [initial, createSetStateMock(initial as Record<string, unknown>)];
    }),
    createElement: vi.fn(),
  };
});

vi.mock('react-hook-form', () => ({
  SubmitHandler: vi.fn(),
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn().mockImplementation(createHandleSubmitMock),
    formState: { errors: {}, isValid: true },
    control: vi.fn(),
    watch: vi.fn((name: keyof typeof mockValues) => mockValues[name]),
  }),
  useWatch: vi.fn(),
}));

describe('onSubmit', () => {
  beforeAll(() => {
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

    vi.mock('components/PasswordInput', () => {
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

    vi.mock('./hooks/useSignup', () => ({
      useSignUp: vi.fn().mockReturnValue({ doRegisterPreCreatedUser: vi.fn() }),
      parseUserSettingsEnsureKyberKeysAdded: vi.importActual,
    }));

    vi.mock('components/PasswordStrengthIndicator', () => ({
      default: {
        PasswordStrengthIndicator: () => <div>Mocked Password Strength Indicator</div>,
      },
    }));

    vi.mock('services/error.service', () => ({
      default: {
        castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
        reportError: vi.fn(),
      },
    }));

    vi.mock('services/local-storage.service', () => ({
      default: {
        get: vi.fn(),
        clear: vi.fn(),
        getUser: vi.fn(),
        set: vi.fn(),
      },
    }));

    vi.mock('services/navigation.service', () => ({
      default: {
        push: vi.fn(),
        history: {
          location: {
            search: { email: 'mock@email.com' },
          },
        },
      },
    }));

    vi.mock('../../app/i18n/provider/TranslationProvider', () => ({
      useTranslationContext: vi.fn().mockReturnValue({
        translate: vi.fn().mockImplementation((value: string) => {
          return value;
        }),
      }),
    }));

    vi.mock('components', () => ({
      ExpiredLinkView: vi.fn(() => <div>Mocked Expired Link View</div>),
    }));

    vi.mock('query-string', () => ({
      parse: vi.fn().mockImplementation((input: string) => input),
    }));

    vi.mock('react-redux', () => ({
      useSelector: vi.fn(),
      useDispatch: vi.fn(() => vi.fn()),
    }));

    vi.mock('./utils', () => ({
      onChangePasswordHandler: vi.fn(),
    }));

    vi.mock('services/workspace.service', () => ({
      default: {
        validateWorkspaceInvitation: vi.fn().mockImplementation(() => {
          return true;
        }),
      },
    }));

    vi.mock('../../app/store/hooks', () => ({
      useAppDispatch: vi.fn().mockReturnValue(vi.fn()),
    }));

    vi.mock('../../app/store/slices/plan', () => ({
      planThunks: {
        initializeThunk: vi.fn(),
      },
    }));

    vi.mock('../../app/store/slices/products', () => ({
      productsThunks: {
        initializeThunk: vi.fn(),
      },
    }));

    vi.mock('../../app/store/slices/referrals', () => ({
      referralsThunks: {
        initializeThunk: vi.fn(),
      },
    }));

    vi.mock('../../app/store/slices/user', () => ({
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
    vi.resetModules();
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'magicIv') return mockMagicIv;
      if (key === 'magicSalt') return mockMagicSalt;
      if (key === 'newApi') return mockApi;
      if (key === 'secret') return mockSecret;
      if (key === 'hostname') return mockHostname;
      else return 'no mock implementation';
    });
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
    render(<WorkspaceGuestSingUpView />);
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
    render(<WorkspaceGuestSingUpView />);
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
