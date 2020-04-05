import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { Router } from 'react-router-dom'
import history from './lib/history'
import 'bootstrap/dist/css/bootstrap.css';

ReactDOM.render(<Router history={history}><App /></Router>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
if (window.location.hostname === 'cloud.internxt.com') {
    localStorage.clear();
    window.location.href = 'https://drive.internxt.com'
    serviceWorker.unregister();
}
else {
    serviceWorker.register();
}