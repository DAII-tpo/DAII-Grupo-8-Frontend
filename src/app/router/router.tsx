import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AuthLayout } from '../../layouts/AuthLayout/AuthLayout';
import { MainLayout } from '../../layouts/MainLayout/MainLayout';
import { ActiveTripPage } from '../../pages/ActiveTrip';
import { AdministrationPage } from '../../pages/Administration';
import { BicyclesPage } from '../../pages/Bicycles';
import { HistoryPage } from '../../pages/History';
import { HomePage } from '../../pages/Home';
import { LoginPage } from '../../pages/Login';
import { MapPage } from '../../pages/Map';
import { ReportsPage } from '../../pages/Reports';
import { StationsPage } from '../../pages/Stations';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/movilidad" replace /> },
      { path: 'movilidad', element: <HomePage /> },
      { path: 'movilidad/mapa', element: <MapPage /> },
      { path: 'movilidad/estaciones', element: <StationsPage /> },
      { path: 'movilidad/bicicletas', element: <BicyclesPage /> },
      { path: 'movilidad/viaje-activo', element: <ActiveTripPage /> },
      { path: 'movilidad/historial', element: <HistoryPage /> },
      { path: 'movilidad/reportes', element: <ReportsPage /> },
      { path: 'movilidad/administracion', element: <AdministrationPage /> },
    ],
  },
]);
