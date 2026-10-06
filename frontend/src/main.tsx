import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import {WorkspaceManagerProvider} from './workspaces/WorkspaceContext';
import './styles.css';
import './intelligence/intelligence.css';
import './dashboard/dashboard.css';
import './presentation/presentation.css';
import './presentation/theme.css';
import './workspaces/workspaces.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><WorkspaceManagerProvider><App/></WorkspaceManagerProvider></BrowserRouter></React.StrictMode>);

import './experience/experience.css';
