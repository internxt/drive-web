import React from 'react';

const SVG = ({
    color = 'blue',
    width = 99,
    height = 78,
}) => {
    // Correct color when is passed null
    color = !color ? 'blue' : color 
    return (
        <svg xmlns="http://www.w3.org/2000/svg" 
            width={width} 
            height={height}
            viewBox="0 0 99 78">
            <defs>
                <linearGradient id="folder-blue-a" x1="50%" x2="50%" y1="2.892%" y2="100%">
                    <stop offset="0%" stopColor="#B3D1FF"/>
                    <stop offset="100%" stopColor="#87B7FF"/>
                </linearGradient>
                <linearGradient id="folder-green-a" x1="50%" x2="50%" y1="2.892%" y2="100%">
                    <stop offset="0%" stopColor="#BDDB93"/>
                    <stop offset="100%" stopColor="#7EC45A"/>
                </linearGradient>
                <linearGradient id="folder-grey-a" x1="50%" x2="50%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#D4D4D4"/>
                    <stop offset="100%" stopColor="#BABABA"/>
                </linearGradient>
                <linearGradient id="folder-pink-a" x1="50%" x2="50%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFB3DB"/>
                    <stop offset="100%" stopColor="#FF87C7"/>
                </linearGradient>
                <linearGradient id="folder-purple-a" x1="50%" x2="50%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#DDB3FF"/>
                    <stop offset="100%" stopColor="#C680FF"/>
                </linearGradient>
                <linearGradient id="folder-red-a" x1="50%" x2="50%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFB3B3"/>
                    <stop offset="100%" stopColor="#FF8787"/>
                </linearGradient>
                <linearGradient id="folder-yellow-a" x1="50%" x2="50%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFE3B3"/>
                    <stop offset="100%" stopColor="#FFCE7A"/>
                </linearGradient>
            </defs>
            <path 
                fill={`url(#folder-${color}-a)`} 
                fillRule="evenodd" 
                d="M638.669178,104.684932 C641.426247,104.684932 643.663493,106.91749 643.663493,109.671491 L643.663493,140.305284 L643.663493,171.355863 C643.663493,172.9616 642.359436,174.264721 640.750801,174.264721 L547.912692,174.264721 C546.306358,174.264721 545,172.962381 545,171.355863 L545,140.305284 L545,109.671491 C545,109.560796 545.003606,109.450949 545.010708,109.342062 C545.003606,109.233251 545,109.123489 545,109.012885 L545,101.985105 C545,99.2309234 547.236317,97 549.994954,97 L572.892877,97 C574.896915,97 576.623884,98.1764588 577.419754,99.8747346 C577.421541,99.8610064 578.263176,101.332648 578.633429,101.826292 C579.056431,102.390265 579.020516,102.478345 579.760343,103.182973 C580.575974,103.9598 580.776343,104.042126 581.151796,104.227487 C581.303355,104.302311 581.609433,104.474789 582.094499,104.556078 C582.570567,104.635858 583.142944,104.670599 583.473539,104.684932 L638.669178,104.684932 Z" 
                transform="translate(-545 -97)"
            />
        </svg>   
    )
};

export default SVG;