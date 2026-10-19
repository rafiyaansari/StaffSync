import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './styles/base.css';
import './styles/ui.css';
import './styles/components.css';
import './styles/toast.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/dashboard.css';
import './styles/auth.css';
import './styles/employees.css';
import './styles/attendance.css';
import './styles/leaves.css';
import './styles/announcements.css';
import './styles/training.css';
import './styles/profile.css';
import './styles/settings.css';
import './styles/notifications.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
