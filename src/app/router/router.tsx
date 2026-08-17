import { createBrowserRouter } from 'react-router-dom';

import { PlaceholderPage } from '../../components/common/PlaceholderPage';
import { AuthLayout } from '../../layouts/AuthLayout/AuthLayout';
import { MainLayout } from '../../layouts/MainLayout/MainLayout';
import { ActiveTripPage } from '../../pages/ActiveTrip';
import { AdministrationPage } from '../../pages/Administration';
import { BicyclesPage } from '../../pages/Bicycles';
import { HistoryPage } from '../../pages/History';
import { HomePage } from '../../pages/Home';
import { LoginPage } from '../../pages/Login';
import { MapPage } from '../../pages/Map';
import { MobilityPage } from '../../pages/Mobility';
import { ReportsPage } from '../../pages/Reports';
import { StationsPage } from '../../pages/Stations';
import { RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'movilidad', element: <MobilityPage /> },
      { path: 'movilidad/mapa', element: <MapPage /> },
      { path: 'movilidad/estaciones', element: <StationsPage /> },
      { path: 'movilidad/bicicletas', element: <BicyclesPage /> },
      { path: 'movilidad/viaje-activo', element: <ActiveTripPage /> },
      { path: 'movilidad/historial', element: <HistoryPage /> },
      { path: 'movilidad/reportes', element: <ReportsPage /> },
      { path: 'movilidad/administracion', element: <AdministrationPage /> },
      { path: 'residuos', element: <PlaceholderPage title="Residuos" /> },
      { path: 'reclamos', element: <PlaceholderPage title="Reclamos" /> },
      { path: 'emergencias', element: <PlaceholderPage title="Emergencias" /> },
      {
        path: 'espacios-publicos',
        element: <PlaceholderPage title="Espacios Públicos" />,
      },
      {
        path: 'cultura-eventos',
        element: <PlaceholderPage title="Cultura y Eventos" />,
      },
      { path: 'analitica', element: <PlaceholderPage title="Analítica" /> },
      { path: 'mi-cuenta', element: <PlaceholderPage title="Mi Cuenta" /> },
      {
        path: 'configuracion',
        element: <PlaceholderPage title="Configuración" />,
      },
    ],
  },
]);
