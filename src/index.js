import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from "react-router-dom";
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import 'bootstrap/dist/css/bootstrap.css';
import { createBrowserHistory } from 'history';

// Router history for navigate through components
const history = createBrowserHistory();

ReactDOM.render(
    <Router>
      <App history={history}/>
    </Router>,
    document.getElementById("root")
  );
  
registerServiceWorker();
