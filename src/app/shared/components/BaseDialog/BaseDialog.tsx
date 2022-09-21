import UilTimes from '@iconscout/react-unicons/icons/uil-times';

interface BaseDialogProps {
  isOpen: boolean;
  title: string;
  children: JSX.Element | JSX.Element[];
  classes?: string;
  titleClasses?: string;
  panelClasses?: string;
  bgColor?: string;
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
  bgColor,
}: BaseDialogProps): JSX.Element => {
  return (
    <div
      className={`${isOpen ? 'flex' : 'hidden'} ${classes || ''
        } absolute top-0 left-0 right-0 bottom-0 bg-neutral-100 bg-opacity-80 z-10`}
    >
      <div
        className={`${panelClasses || ''} text-neutral-900 flex flex-col absolute top-1/2 left-1/2 \
        transform -translate-y-1/2 -translate-x-1/2 w-104 pt-8 rounded-lg overflow-hidden ${bgColor || 'bg-white'}`}
      >
        <UilTimes
          className="absolute right-8 cursor-pointer transition duration-200\
           ease-in-out text-blue-60 hover:text-blue-70"
          onClick={onClose}
        />

        <span
          className={`${titleClasses || ''
            } whitespace-nowrap text-xl text-center px-16 overflow-hidden overflow-ellipsis`}
        >
          {title}
        </span>

        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
