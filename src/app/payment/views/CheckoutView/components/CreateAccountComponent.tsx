import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import TextInput from 'app/auth/components/TextInput/TextInput';
import { IFormValues } from 'app/core/types';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export const CreateAccountComponent = () => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    getValues,
  } = useForm<IFormValues>({
    mode: 'onChange',
  });

  const [passwordState, setPasswordState] = useState<{
    tag: 'error' | 'warning' | 'success';
    label: string;
  } | null>(null);
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);

  return (
    <div className="flex flex-col space-y-8">
      <p className="text-2xl font-semibold text-gray-100">1. Create an account</p>
      <div className="flex flex-col space-y-4 rounded-2xl bg-surface p-5">
        <TextInput
          placeholder={'Email'}
          label="email"
          type="email"
          disabled={false}
          register={register}
          required={true}
          minLength={{ value: 1, message: 'Email must not be empty' }}
          error={errors.email}
        />

        <label className="space-y-0.5">
          <PasswordInput
            className={passwordState ? passwordState.tag : ''}
            placeholder={'Password'}
            label="password"
            maxLength={MAX_PASSWORD_LENGTH}
            register={register}
            onFocus={() => setShowPasswordIndicator(true)}
            required={true}
            error={errors.password}
          />
          {showPasswordIndicator && passwordState && (
            <PasswordStrengthIndicator className="pt-1" strength={passwordState.tag} label={passwordState.label} />
          )}
        </label>
        <p className="text-sm font-medium text-gray-50">
          Privacy guarantee: We do not share your information and will contact you only as needed to provide our
          service.
        </p>
      </div>
    </div>
  );
};
