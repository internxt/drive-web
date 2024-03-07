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
  const isClickableContainerClass = isClickable ? 'hover:bg-gray-1 hover:bg-gray-5' : '';
  const containerClass = isDisabled ? '' : isActive ? 'bg-primary' : isClickableContainerClass;
  const isClickableClass = isClickable ? 'hover:cursor-pointer' : '';
  const textClass = isDisabled ? 'text-gray-40' : isActive ? 'text-white' : 'text-gray-80';
  const textClass2 = isSection ? 'font-semibold' : '';
  const textClass3 = isSubsection ? 'px-3' : '';
  const notificationClass = isActive ? 'bg-white' : ' bg-primary';
  const notificationTextClass = isActive ? 'text-primary' : 'text-white';

  return (
    <div
      className={`flex h-10 w-full items-center justify-between rounded-lg px-3 py-2
       ${isClickableClass} ${containerClass}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <span className={`text-base font-normal ${textClass} ${textClass2} ${textClass3}`}>{text}</span>
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
