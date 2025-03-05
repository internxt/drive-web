import { KeyboardEvent, useState } from 'react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';
import { UserPlus, X } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { IFormValues } from '../../../../core/types';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import { Button } from '@internxt/ui';
import Card from '../../../../shared/components/Card';
import Input from '../../../../shared/components/Input';
import Modal from '../../../../shared/components/Modal';
import BaseCheckbox from '../../../../shared/components/forms/BaseCheckbox/BaseCheckbox';
import TextArea from '../../Account/Account/components/TextArea';
import UserCard from './components/UserCard';

interface UserInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  processInvitation: (emailList: string[], messageText: string) => Promise<void>;
}

type UsersToInvite = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  avatar: null | string;
  storage?: number;
};

const UserInviteDialog = ({ isOpen, onClose, processInvitation }: UserInviteDialogProps): JSX.Element => {
  const { handleSubmit } = useForm<IFormValues>({ mode: 'onChange' });
  const { translate } = useTranslationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailAccent, setEmailAccent] = useState<string>('');
  const [isAddMessageSelected, setIsAddMessageSelected] = useState<boolean>(false);
  const [messageText, setMessageText] = useState('');
  const [usersToInvite, setUsersToInvite] = useState<UsersToInvite[]>([]);
  const existsUsersToInvite = usersToInvite.length > 0;

  const onRemoveUser = (email: string) => {
    const newUsersToInvite = usersToInvite.filter((user) => user.email !== email);
    setUsersToInvite(newUsersToInvite);
  };

  const onAddUsers = async () => {
    const isDuplicated = usersToInvite.find((user) => user.email === email);
    const isValid = isValidEmail(email);

    if (isDuplicated || !isValid) {
      setEmailAccent('error');
      return;
    }

    // MOCKED
    setUsersToInvite([...usersToInvite, { name: email, email, lastname: '', avatar: null, id: email }]);
    setEmailAccent('');
    setEmail('');
  };

  const onInviteUser = async () => {
    setIsLoading(true);

    const emailList = usersToInvite.map((user) => user.email);
    await processInvitation(emailList, messageText);

    setUsersToInvite([]);
    setIsLoading(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const keyPressed = event.key;
    if (keyPressed === ' ' || keyPressed === ',') {
      event.preventDefault();
      onAddUsers();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* HEADER */}
      <div className="-mx-5 flex flex-row items-center justify-between border-b border-gray-10 px-5 pb-5">
        <span
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium"
          title={translate('preferences.workspace.members.inviteDialog.title')}
        >
          {translate('preferences.workspace.members.inviteDialog.title')}
        </span>
        <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out hover:bg-black/4 active:bg-black/8">
          <X onClick={() => (isLoading ? null : onClose())} size={22} />
        </div>
      </div>
      {/* BODY */}
      <div className="mt-5 ">
        <form className="flex w-full" onSubmit={handleSubmit(onAddUsers)}>
          <div className="w-full">
            <Input
              className="mr-2 w-full"
              required
              disabled={isLoading}
              variant="email"
              onChange={(e) => setEmail(e)}
              accent={emailAccent === 'error' ? 'error' : undefined}
              name="email"
              value={email}
              onKeyDown={handleKeyDown}
            />
            <span className="text-xs font-normal text-gray-60">
              {translate('preferences.workspace.members.inviteDialog.inputDescription')}
            </span>
          </div>
        </form>
        <div className="mt-3 max-h-44 overflow-y-scroll">
          {usersToInvite
            .slice()
            .reverse()
            .map(({ id, name, lastname, email: userEmail }) => (
              <div key={id} className="flex flex-row justify-between py-2">
                <UserCard name={name} lastName={lastname} email={userEmail} avatarSrc={''} />
                <Button
                  variant="secondary"
                  className="h-8"
                  disabled={isLoading}
                  onClick={() => onRemoveUser(userEmail)}
                >
                  {translate('preferences.workspace.members.inviteDialog.remove')}
                </Button>
              </div>
            ))}
        </div>
        <Card className="mt-6 dark:bg-gray-5">
          <div className="flex w-full items-center justify-center">
            {usersToInvite.length ? (
              <div className="flex w-full items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-10 dark:bg-gray-30">
                  <UserPlus size={20} width={36} />
                </div>
                <p className="text-left text-sm font-normal text-gray-100">
                  {translate('preferences.workspace.members.inviteDialog.inviteUsersDescription')}
                </p>
              </div>
            ) : (
              <p className="text-center text-sm font-normal text-gray-100">
                {translate('preferences.workspace.members.inviteDialog.enterUserEmail')}
              </p>
            )}
          </div>
        </Card>
        {isAddMessageSelected && (
          <div className="mt-6">
            <TextArea
              placeholder="Enter your message text (optional)"
              value={messageText}
              onChangeValue={setMessageText}
              disabled={isLoading}
              rows={3}
              maxCharacters={250}
            />
          </div>
        )}
        <div className={`${isAddMessageSelected ? 'mt-2' : 'mt-8'} flex w-full flex-row items-center justify-between`}>
          <button
            className={`flex items-center ${!isLoading ? 'cursor-pointer' : ''}`}
            onClick={() => !isLoading && setIsAddMessageSelected(!isAddMessageSelected)}
          >
            <BaseCheckbox checked={isAddMessageSelected} />
            <p className="ml-2 text-base font-medium">
              {translate('preferences.workspace.members.inviteDialog.addMessage')}
            </p>
          </button>
          <Button variant="primary" disabled={!existsUsersToInvite} onClick={onInviteUser} loading={isLoading}>
            {translate('preferences.workspace.members.inviteDialog.invite')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserInviteDialog;
