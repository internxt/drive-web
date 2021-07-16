import './SideNavigatorItem.scss';

interface SideNavigatorItemProps {
  text: string,
  icon: string,
  isOpen: boolean,
  tooltipText?: string,
  onClick?: () => void
}

const SideNavigatorItem = ({ text, icon, isOpen, tooltipText, onClick }: SideNavigatorItemProps): JSX.Element => {
  onClick = onClick || (() => { });

  return (
    <div className='select-none px-3 py-1 w-full hover:bg-l-neutral-30'>
      <div className='flex items-center w-max cursor-pointer'
        onClick={onClick}
      >
        <div className='flex items-center h-5'>
          <img src={icon} alt="" className='mr-2.5' />
        </div>

        {isOpen
          ? <span className='text-base text-neutral-10' data-for="mainTooltip" data-tip={tooltipText} data-iscapture="true">{text}</span>
          : null
        }
      </div>
    </div>
  );
};

export default SideNavigatorItem;
