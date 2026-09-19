import { Tabs } from '@mantine/core';
import { NavLink, useLocation } from 'react-router-dom';

import { env } from '../../../config/env';

import classes from './MobilityNavigation.module.css';

const navigationItems = [
  { label: 'Inicio', path: '/movilidad', value: 'inicio' },
  { label: 'Mapa', path: '/movilidad/mapa', value: 'mapa' },
  { label: 'Estaciones', path: '/movilidad/estaciones', value: 'estaciones' },
  { label: 'Bicicletas/Viajes', path: '/movilidad/bicicletas', value: 'bicicletas' },
  { label: 'Historial', path: '/movilidad/historial', value: 'historial' },
  { label: 'Reportes', path: '/movilidad/reportes', value: 'reportes' },
  { label: 'Administracion', path: '/movilidad/administracion', value: 'administracion' },
];

type MobilityNavigationProps = {
  showAdministration?: boolean;
};

export function MobilityNavigation({
  showAdministration = env.demoUserRole === 'ADMIN',
}: MobilityNavigationProps = {}) {
  const { pathname } = useLocation();
  const visibleItems = navigationItems.filter(
    (item) => item.value !== 'administracion' || showAdministration,
  );
  const activeItem = visibleItems.find((item) => item.path === pathname);

  return (
    <Tabs classNames={{ list: classes.tabsList }} value={activeItem?.value ?? null}>
      <Tabs.List>
        {visibleItems.map((item) => (
          <Tabs.Tab
            key={item.value}
            renderRoot={(props) => <NavLink {...props} end to={item.path} />}
            value={item.value}
          >
            {item.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
