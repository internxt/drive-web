import * as React from 'react'
import './HeaderButton.scss'

interface HeaderButtonProps {
    icon: string
    name: string
    clickHandler?: any
}

const HeaderButton = (props: HeaderButtonProps) => {
    return (
        <div className="HeaderButton" onClick={props.clickHandler}>
            <img src={props.icon} alt={props.name} />
        </div>
    )
}

export default HeaderButton