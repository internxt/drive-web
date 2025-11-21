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
      } absolute bottom-0 left-0 right-0 top-0 z-50 bg-black/40`}
    >
      <div
        className={`${panelClasses || ''} absolute left-1/2 top-1/2 flex w-104 -translate-x-1/2
        -translate-y-1/2 flex-col overflow-hidden  ${dialogRounded ? 'rounded-2xl' : 'rounded-lg pt-8'} text-gray-100 ${
          bgColor || 'bg-surface'
        }`}
      >
        <div className={`${subTitle ? 'justify-between bg-gray-1 p-5' : ''} flex flex-row items-start`}>
          {title ? (
            <div className="relative flex max-w-full flex-1 flex-col truncate">
              <span className={`${titleClasses || ''} truncate text-xl`} title={title}>
                {title}
              </span>
              <span className="max-w-fit flex-1 truncate text-base font-normal text-gray-50">{subTitle}</span>
            </div>
          ) : null}
          {hideCloseButton ? null : (
            <div
              className={`relative ml-auto cursor-pointer bg-surface
           transition duration-200 ease-in-out ${closeClass || 'text-primary hover:text-primary-dark'} `}
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
