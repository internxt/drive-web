import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { useState } from 'react';
import { Spinner } from '@phosphor-icons/react';
import Input from 'app/shared/components/Input';

type SharePasswordInputDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSavePassword: (password: string) => Promise<void> | void;
};

export const SharePasswordInputDialog = ({ isOpen, onClose, onSavePassword }: SharePasswordInputDialogProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [password, setPassword] = useState('');

  const handleConfirm = async () => {
    setIsLoading(true);
    await onSavePassword(password);
    setIsLoading(false);
  };

  return (
    <Modal maxWidth="max-w-sm" className="space-y-5 p-5" isOpen={isOpen} onClose={onClose}>
      <p className="text-2xl font-medium">Edit password</p>
      <Input
        onChange={(value) => {
          if (value.length <= 50) {
            setPassword(value);
          }
        }}
        value={password}
        variant="password"
      />
      <div className="flex items-center justify-end space-x-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} loading={isLoading}>
          {isLoading && <Spinner className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </Modal>
  );
};
