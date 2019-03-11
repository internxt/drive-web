import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from "react-router-dom";
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import 'bootstrap/dist/css/bootstrap.css';
import history from './history'; // Router history for navigate through components

ReactDOM.render(
    <Router history={history}>
      <App />
    </Router>,
    document.getElementById("root")
  );
  
registerServiceWorker();
