import './SideNavigatorItem.scss';

interface SideNavigatorItemProps {
  text: string,
  icon: string,
  isOpen: boolean,
  tooltipText: string
}

const SideNavigatorItem = ({ text, icon, isOpen, tooltipText }: SideNavigatorItemProps): JSX.Element => {
  return (
    <div>
      <div className='h-max mb-2 select-none'>
        <div className='flex items-center w-max cursor-pointer'
          onClick={() => { }}
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
    </div>
  );
};

export default SideNavigatorItem;
