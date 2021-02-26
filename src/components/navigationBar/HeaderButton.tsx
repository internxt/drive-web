import * as React from 'react';
import './HeaderButton.scss';

interface HeaderButtonProps {
    icon: string
    name: string
    clickHandler?: any
}

const HeaderButton = (props: HeaderButtonProps) => {
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