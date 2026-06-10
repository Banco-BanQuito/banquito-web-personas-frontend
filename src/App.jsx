import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './router/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';

import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { BranchesPage } from './pages/BranchesPage';
import { HolidaysPage } from './pages/HolidaysPage';
import { ProfilePage } from './pages/ProfilePage';
import { TransferPage } from './pages/TransferPage';

import './index.css';

const WebPersonasLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
      <Topbar />
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((value) => !value)} />
      <main
        className="overflow-auto transition-all duration-300"
        style={{
          marginTop: '4rem',
          marginLeft: isSidebarOpen ? '14rem' : '3.5rem',
          height: 'calc(100vh - 4rem)',
        }}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/cambiar-contrasena',
      element: <ChangePasswordPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <WebPersonasLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'perfil', element: <ProfilePage /> },
        { path: 'transferencia', element: <TransferPage /> },
        { path: 'sucursales', element: <BranchesPage /> },
        { path: 'feriados', element: <HolidaysPage /> },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AuthProvider>
  );
}