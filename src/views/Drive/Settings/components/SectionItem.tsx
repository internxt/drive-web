export interface SectionItemProps {
  text: string;
  isActive?: boolean;
  isSection?: boolean;
  isSubsection?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  notificationsNumber: number;
}

const SectionItem = ({
  text,
  isActive,
  isDisabled,
  isSection,
  isSubsection,
  notificationsNumber,
  onClick,
}: SectionItemProps) => {
  const isClickable = !!onClick;
  const clickableContainerClass = isClickable ? 'hover:bg-gray-1 hover:bg-gray-5' : '';
  const activeContainerClass = isActive ? 'bg-primary' : clickableContainerClass;
  const containerClass = isDisabled ? '' : activeContainerClass;
  const clickableClass = isClickable ? 'hover:cursor-pointer' : '';
  const activeTextClass = isActive ? 'text-white' : 'text-gray-80';
  const disabledTextClass = isDisabled ? 'text-gray-40' : activeTextClass;
  const sectionTextClass = isSection ? 'font-semibold' : '';
  const subsectionTextClass = isSubsection ? 'px-3' : '';
  const notificationClass = isActive ? 'bg-white' : ' bg-primary';
  const notificationTextClass = isActive ? 'text-primary' : 'text-white';

  return (
    <div
      className={`flex h-10 w-full items-center justify-between rounded-lg px-3 py-2
       ${clickableClass} ${containerClass}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
          onClick();
        }
      }}
    >
      <div className="flex items-center">
        <span className={`text-base font-normal ${disabledTextClass} ${sectionTextClass} ${subsectionTextClass}`}>
          {text}
        </span>
      </div>
      {notificationsNumber > 0 && (
        <div className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 ${notificationClass}`}>
          <span className={`text-xs font-normal  ${notificationTextClass}`}>{notificationsNumber}</span>
        </div>
      )}
    </div>
  );
};

export default SectionItem;
