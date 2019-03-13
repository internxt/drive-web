import * as React from 'react'
import './HeaderButton.css'

const HeaderButton = props => {
    return (
        <div className="HeaderButton" onClick={props.clickHandler}>
            <img src={props.icon} alt={props.name} />
        </div>
    )
}

export default HeaderButton