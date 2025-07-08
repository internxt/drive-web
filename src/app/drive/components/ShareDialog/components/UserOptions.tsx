import { Popover } from '@headlessui/react';
import { Check } from '@phosphor-icons/react';

export const UserOptions = ({
  listPosition,
  selectedUserListIndex,
  userOptionsY,
  translate,
  onRemoveUser,
  userOptionsEmail,
  selectedRole,
  onChangeRole,
  disableRoleChange,
}): JSX.Element => {
  const isUserSelected = selectedUserListIndex === listPosition;

  return isUserSelected ? (
    <Popover
      className="absolute z-10 h-0 max-h-0 w-full"
      style={{
        top: `${userOptionsY}px`,
        right: 0,
        minWidth: '160px',
      }}
    >
      <Popover.Panel
        className={`absolute right-0 z-10 origin-top-right whitespace-nowrap rounded-lg border border-gray-10 bg-surface p-1 shadow-subtle transition-all duration-50 ease-out dark:bg-gray-5 ${
          isUserSelected ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
        style={{
          top: '44px',
          minWidth: '160px',
        }}
        static
      >
        {disableRoleChange ? (
          <></>
        ) : (
          <>
            {/* Editor */}
            <button
              className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5 dark:hover:bg-gray-10"
              onClick={() => {
                onChangeRole('editor');
              }}
            >
              <p className="w-full text-left text-base font-medium leading-none">
                {translate('modals.shareModal.list.userItem.roles.editor')}
              </p>
              {selectedRole === 'editor' && <Check size={20} />}
            </button>

            {/* Reader */}
            <button
              className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5 dark:hover:bg-gray-10"
              onClick={() => {
                onChangeRole('reader');
              }}
            >
              <p className="w-full text-left text-base font-medium leading-none">
                {translate('modals.shareModal.list.userItem.roles.reader')}
              </p>
              {selectedRole === 'reader' && <Check size={20} />}
            </button>

            <div className="mx-3 my-0.5 flex h-px bg-gray-10" />
          </>
        )}
        {/* Remove */}
        <button
          className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5 dark:hover:bg-gray-10"
          onClick={() => {
            onRemoveUser(userOptionsEmail);
          }}
        >
          <p className="w-full text-left text-base font-medium leading-none">
            {translate('modals.shareModal.list.userItem.remove')}
          </p>
        </button>
      </Popover.Panel>
    </Popover>
  ) : (
    <></>
  );
};
