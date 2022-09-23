import UilTimes from '@iconscout/react-unicons/icons/uil-times';

interface BaseDialogProps {
  isOpen: boolean;
  title: string;
  children: JSX.Element | JSX.Element[];
  classes?: string;
  titleClasses?: string;
  panelClasses?: string;
  onClose: () => void;
}

const BaseDialog = ({
  isOpen,
  title,
  children,
  onClose,
  classes,
  panelClasses,
  titleClasses,
}: BaseDialogProps): JSX.Element => {
  return (
    <div
      className={`${isOpen ? 'flex' : 'hidden'} ${
        classes || ''
      } absolute top-0 left-0 right-0 bottom-0 z-50 bg-neutral-100 bg-opacity-80`}
    >
      <div
        className={`${panelClasses || ''} absolute top-1/2 left-1/2 flex w-104 -translate-y-1/2
        -translate-x-1/2 transform flex-col overflow-hidden rounded-lg bg-white pt-8 text-neutral-900`}
      >
        <UilTimes
          className="absolute right-8 cursor-pointer text-blue-60 transition
           duration-200 ease-in-out hover:text-blue-70"
          onClick={onClose}
        />

        <span
          className={`${
            titleClasses || ''
          } overflow-hidden overflow-ellipsis whitespace-nowrap px-16 text-center text-xl`}
        >
          {title}
        </span>

        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
