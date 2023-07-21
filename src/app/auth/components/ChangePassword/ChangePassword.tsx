import { Dispatch, SetStateAction, useState, RefObject, createRef } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';
import { CaretLeft, FileArrowUp, Warning } from '@phosphor-icons/react';
import { validateMnemonic } from 'bip39';

interface ChangePasswordProps {
  setHasBackupKey: Dispatch<SetStateAction<boolean | undefined>>;
}
export default function ChangePassword(props: ChangePasswordProps): JSX.Element {
  const { translate } = useTranslationContext();

  const [backupKeyInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [buckupKeyContent, setBackupKeyContent] = useState<string>('');

  const uploadBackupKey = () => {
    backupKeyInputRef.current?.click();
  };

  const onUploadBackupKeyInputChanged = async (e) => {
    const file = e.target.files[0];
    const backupKey = await file.text();
    const isValidBackupKey = validateMnemonic(backupKey);

    isValidBackupKey && setBackupKeyContent(backupKey);
  };

  return (
    <>
      {!buckupKeyContent ? (
        <>
          <input
            className="hidden"
            ref={backupKeyInputRef}
            type="file"
            onChange={onUploadBackupKeyInputChanged}
            accept=".txt"
          />
          <span
            onClick={() => props.setHasBackupKey(undefined)}
            className="font-regular cursor mb-1 flex items-center text-base text-blue-60"
          >
            <CaretLeft size={18} weight="thin" className="mr-0.5" />
            {translate('auth.recoverAccount.title')}
          </span>
          <h3 className="mb-5 text-2xl font-medium">{translate('auth.recoverAccount.backupKey.title')}</h3>
          <div className="font-regular mb-4 flex rounded-md border border-orange-br bg-orange-bg p-4 text-sm text-orange-dark">
            <span className="mr-1.5 pt-0.5">
              <Warning size={18} weight="fill" />
            </span>
            <p>{translate('auth.recoverAccount.backupKey.alert')}</p>
          </div>
          <Button
            loading={false}
            variant="primary"
            className="mb-2 w-full text-base font-medium text-white"
            onClick={uploadBackupKey}
          >
            <span className="flex items-center">
              <FileArrowUp size={24} className="mr-2" />
              {translate('auth.recoverAccount.backupKey.button')}
            </span>
          </Button>
        </>
      ) : (
        <h1>New password</h1>
      )}
    </>
  );
}
