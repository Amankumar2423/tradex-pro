import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminDashboard from './AdminDashboard';

const isAdmin = window.location.pathname === '/admin';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(isAdmin ? <AdminDashboard /> : <App />);