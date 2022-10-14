import UilTimes from '@iconscout/react-unicons/icons/uil-times';
import { subtract } from 'lodash';

interface BaseDialogProps {
  isOpen: boolean;
  title: string;
  subTitle?: string;
  textLeft?: boolean;
  dialogRounded?: boolean;
  children: JSX.Element | JSX.Element[];
  classes?: string;
  titleClasses?: string;
  panelClasses?: string;
  closeClass?: string;
  bgColor?: string;
  onClose: () => void;
}

const BaseDialog = ({
  isOpen,
  title,
  subTitle,
  dialogRounded,
  textLeft,
  children,
  onClose,
  classes,
  panelClasses,
  titleClasses,
  closeClass,
  bgColor,
}: BaseDialogProps): JSX.Element => {
  return (
    <div
      className={`${isOpen ? 'flex' : 'hidden'} ${
        classes || ''
      } absolute top-0 left-0 right-0 bottom-0 z-10 bg-neutral-100 bg-opacity-80`}
    >
      <div
        className={`${panelClasses || ''} absolute top-1/2 left-1/2 flex w-104 -translate-y-1/2
        -translate-x-1/2 transform flex-col overflow-hidden  ${
          dialogRounded ? 'rounded-2xl' : 'rounded-lg pt-8'
        } text-neutral-900 ${bgColor || 'bg-white'}`}
      >
        <div className={`${subTitle ? 'flex-row items-center bg-neutral-10 py-5 pl-5' : ''}`}>
          <UilTimes
            className={`absolute right-8 cursor-pointer duration-200 ${closeClass || 'text-blue-60 hover:text-blue-70'} 
           transition ease-in-out `}
            onClick={onClose}
          />
          <span
            className={`${titleClasses || ''} overflow-hidden overflow-ellipsis whitespace-nowrap ${
              textLeft ? 'text-left text-black' : ' px-16 text-center'
            }  text-xl`}
          >
            {title}
            <br />
          </span>
          <p className="text-base font-normal text-neutral-100">{subTitle}</p>
        </div>

        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
