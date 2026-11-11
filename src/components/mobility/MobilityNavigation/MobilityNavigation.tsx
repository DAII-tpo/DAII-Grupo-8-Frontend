import { Tabs } from '@mantine/core';
import { NavLink, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../../app/providers/authContext';
import { canAccessAdministration } from '../../../types/auth';

import classes from './MobilityNavigation.module.css';

const navigationItems = [
  { label: 'Inicio', path: '/movilidad', value: 'inicio' },
  { label: 'Mapa', path: '/movilidad/mapa', value: 'mapa' },
  { label: 'Estaciones', path: '/movilidad/estaciones', value: 'estaciones' },
  { label: 'Eventos', path: '/movilidad/eventos', value: 'eventos' },
  { label: 'Bicicletas/Viajes', path: '/movilidad/bicicletas', value: 'bicicletas' },
  { label: 'Historial', path: '/movilidad/historial', value: 'historial' },
  { label: 'Reportes', path: '/movilidad/reportes', value: 'reportes' },
  { label: 'Analítica', path: '/movilidad/analitica', value: 'analitica' },
];

export function MobilityNavigation() {
  const { pathname } = useLocation();
  const auth = useContext(AuthContext);
  const visibleItems = navigationItems.filter((item) => item.value !== 'analitica' || canAccessAdministration(auth?.user ?? null));
  const activeItem = navigationItems.find((item) => item.path === pathname);

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
