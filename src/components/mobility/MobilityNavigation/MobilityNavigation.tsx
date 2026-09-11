import { Tabs } from '@mantine/core';
import { NavLink, useLocation } from 'react-router-dom';

import classes from './MobilityNavigation.module.css';

const navigationItems = [
  { label: 'Inicio', path: '/movilidad', value: 'inicio' },
  { label: 'Mapa', path: '/movilidad/mapa', value: 'mapa' },
  { label: 'Estaciones', path: '/movilidad/estaciones', value: 'estaciones' },
  { label: 'Bicicletas', path: '/movilidad/bicicletas', value: 'bicicletas' },
  { label: 'Viaje activo', path: '/movilidad/viaje-activo', value: 'viaje-activo' },
  { label: 'Historial', path: '/movilidad/historial', value: 'historial' },
  { label: 'Reportes', path: '/movilidad/reportes', value: 'reportes' },
  { label: 'Administracion', path: '/movilidad/administracion', value: 'administracion' },
];

export function MobilityNavigation() {
  const { pathname } = useLocation();
  const activeItem = navigationItems.find((item) => item.path === pathname);

  return (
    <Tabs classNames={{ list: classes.tabsList }} value={activeItem?.value ?? null}>
      <Tabs.List>
        {navigationItems.map((item) => (
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
