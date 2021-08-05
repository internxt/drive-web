import './HeaderButton.scss';

interface HeaderButtonProps {
    icon: string;
    name: string;
    clickHandler?: () => void;
}

const HeaderButton = (props: HeaderButtonProps): JSX.Element => {
  return (
    <div className="HeaderButton" onClick={props.clickHandler} style={{
      backgroundImage: `url(${props.icon})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center'
    }}>
    </div>
  );
};

export default HeaderButton;