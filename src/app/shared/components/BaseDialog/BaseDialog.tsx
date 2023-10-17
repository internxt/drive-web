import { IconWeight, X } from '@phosphor-icons/react';

interface BaseDialogProps {
  isOpen: boolean;
  title?: string;
  hideCloseButton?: boolean;
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
  dataTest?: string;
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
  dataTest,
  hideCloseButton,
}: BaseDialogProps): JSX.Element => {
  return (
    <div
      data-test={dataTest}
      className={`${isOpen ? 'flex' : 'hidden'} ${
        classes || ''
      } absolute top-0 left-0 right-0 bottom-0 z-50 bg-black bg-opacity-40`}
    >
      <div
        className={`${panelClasses || ''} absolute top-1/2 left-1/2 flex w-104 -translate-y-1/2
        -translate-x-1/2 transform flex-col overflow-hidden  ${
          dialogRounded ? 'rounded-2xl' : 'rounded-lg pt-8'
        } text-neutral-900 ${bgColor || 'bg-white'}`}
      >
        <div className={`${subTitle ? 'justify-between bg-neutral-10 p-5' : ''} flex flex-row items-start`}>
          {title ? (
            <div className="relative flex max-w-full flex-1 flex-col truncate">
              <span className={`${titleClasses || ''} truncate text-xl`} title={title}>
                {title}
              </span>
              <span className="max-w-fit flex-1 truncate text-base font-normal text-neutral-100">{subTitle}</span>
            </div>
          ) : null}
          {hideCloseButton ? null : (
            <div
              className={`relative ml-auto cursor-pointer
           transition duration-200 ease-in-out ${closeClass || 'text-blue-60 hover:text-blue-70'} `}
            >
              <X onClick={onClose} size={28} weight={weightIcon} />
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default BaseDialog;
