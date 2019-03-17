import React from 'react';
import './ActivityIndicator.css';

import image from "../assets/Dashboard-Icons/Uploading.svg"

const ActivityIndicator = props => <img className="ai-animation" src={image} />;

export default ActivityIndicator;