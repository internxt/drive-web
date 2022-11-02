import { IconWeight, X } from 'phosphor-react';

interface BaseDialogProps {
  isOpen: boolean;
  title: string;
  subTitle?: string;
  dialogRounded?: boolean;
  children: JSX.Element | JSX.Element[];
  classes?: string;
  titleClasses?: string;
  panelClasses?: string;
  closeClass?: string;
  weightIcon?: IconWeight;
  bgColor?: string;
  onClose: () => void;
}

const BaseDialog = ({
  isOpen,
  title,
  subTitle,
  dialogRounded,
  children,
  onClose,
  classes,
  panelClasses,
  titleClasses,
  closeClass,
  weightIcon,
  bgColor,
}: BaseDialogProps): JSX.Element => {
  return (
    <div className={`${isOpen ? 'flex' : 'hidden'} ${classes || ''
      } absolute top-0 left-0 right-0 bottom-0 z-10 bg-black bg-opacity-40`}
    >
      <div className={`${panelClasses || ''} absolute top-1/2 left-1/2 flex w-104 -translate-y-1/2
        -translate-x-1/2 transform flex-col overflow-hidden  ${dialogRounded ? 'rounded-2xl' : 'rounded-lg pt-8'
        } text-neutral-900 ${bgColor || 'bg-white'}`}
      >
        <div className={`${subTitle ? 'justify-between bg-neutral-10 p-5' : ''} flex flex-row items-start`}>
          <div className="max-w-fit relative flex flex-1 flex-col truncate">
            <p
              className={`${titleClasses || ''} overflow-hidden overflow-ellipsis whitespace-nowrap text-xl`}
            >
              {title}
            </p>
            <p className="max-w-fit flex-1 truncate text-base font-normal text-neutral-100">{subTitle}</p>
          </div>
          <div className={`relative cursor-pointer transition
           duration-200 ease-in-out ml-auto ${closeClass || 'text-blue-60 hover:text-blue-70'} `}
          >
            <X onClick={onClose} size={28} weight={weightIcon} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
