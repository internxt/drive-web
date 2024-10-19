import { X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Modal from 'app/shared/components/Modal';
import UserCard from './UserCard';

interface ModifyStorageModal {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
}

export const ModifyStorageModal = ({ isOpen, isLoading, onClose }: ModifyStorageModal): JSX.Element => {
  const { translate } = useTranslationContext();
  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose} preventClosing={isLoading}>
      <div className="flex h-16 w-full items-center justify-between space-x-4 border-b border-gray-10 px-5">
        <span
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium"
          title={translate('preferences.workspace.members.actions.modifyStorage')}
        >
          {translate('preferences.workspace.members.actions.modifyStorage')}
        </span>
        <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out">
          <X onClick={() => (isLoading ? null : onClose())} size={22} />
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex w-full overflow-hidden rounded-xl border border-gray-10 drop-shadow">
          <table width={'100%'}>
            <colgroup>
              <col width={'70%'} />
              <col width={'30%'} />
            </colgroup>
            <thead className="my-1 bg-gray-1">
              <tr>
                <th scope="col" className="text-gray-500 py-3.5 pl-6 text-left text-sm  font-medium">
                  User
                </th>
                <th
                  scope="col"
                  className="text-gray-500 my-1 border-l border-gray-10 px-5 text-left text-sm font-medium"
                >
                  Storage
                </th>
              </tr>
            </thead>
            <tbody
            // className="flex w-full flex-row"
            >
              <tr
              // className="flex w-full flex-row items-center justify-between p-1 py-3.5"
              >
                <td className="text-gray-500 py-2.5 pl-6 text-left text-sm font-medium">
                  <UserCard email="xavi@internxt.com" name="Xavi" lastName="Abad" avatarSrc={null} role="manager" />
                </td>
                <td className="text-gray-500 px-6 text-left text-sm font-medium">200GB</td>
              </tr>
            </tbody>
          </table>
          <div className="flex flex-col border-gray-10 bg-surface drop-shadow"></div>
        </div>
      </div>
    </Modal>
  );
};
