import React from 'react';

const SVG = ({
    defaultColors = {},
    color = "#FFF",
    width = 12,
    height = 10,
}) => {
    // Use default colors if none hex color is set
    color = color.startsWith('#') ? color : defaultColors[color];
    return (    
        <svg xmlns="http://www.w3.org/2000/svg" 
            width={width} 
            height={height} 
            viewBox="0 0 12 10">
        <polyline 
            fill="none" 
            stroke={color} 
            stroke-width="2.5" 
            points="751 444.37 754.341 447.819 761 440.819" 
            transform="translate(-750 -440)"/>
        </svg> 
    )
};

export default SVG;