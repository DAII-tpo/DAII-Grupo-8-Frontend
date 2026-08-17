import { AppShell, Burger, Group, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { BrandLogo } from '../../components/common/BrandLogo';

import classes from './MainLayout.module.css';

type NavigationItem = {
  label: string;
  path: string;
  shortLabel: string;
};

const navigationItems: NavigationItem[] = [
  { label: 'Home', path: '/movilidad', shortLabel: 'H' },
  { label: 'Mapa', path: '/movilidad/mapa', shortLabel: 'M' },
  { label: 'Estaciones', path: '/movilidad/estaciones', shortLabel: 'E' },
  { label: 'Bicicletas', path: '/movilidad/bicicletas', shortLabel: 'B' },
  { label: 'Viaje activo', path: '/movilidad/viaje-activo', shortLabel: 'V' },
  { label: 'Historial', path: '/movilidad/historial', shortLabel: 'HI' },
  { label: 'Reportes', path: '/movilidad/reportes', shortLabel: 'R' },
  {
    label: 'Administracion',
    path: '/movilidad/administracion',
    shortLabel: 'A',
  },
];

export function MainLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
  const [sidebarCollapsed, { toggle: toggleSidebar }] = useDisclosure(false);
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{
        width: sidebarCollapsed ? 88 : 256,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      footer={{ height: 44 }}
      padding="lg"
      classNames={{
        root: classes.shell,
        header: classes.header,
        navbar: classes.navbar,
        main: classes.main,
        footer: classes.footer,
      }}
    >
      <AppShell.Header>
        <Group className={classes.headerContent} justify="space-between">
          <BrandLogo />
          <Group gap="sm">
            <Tooltip label={sidebarCollapsed ? 'Expandir menu' : 'Colapsar menu'}>
              <Burger
                aria-label="Alternar menu lateral"
                color="var(--citypass-night-blue)"
                opened={!sidebarCollapsed}
                visibleFrom="sm"
                onClick={toggleSidebar}
              />
            </Tooltip>
            <Burger
              aria-label="Abrir menu lateral"
              color="var(--citypass-night-blue)"
              hiddenFrom="sm"
              opened={mobileOpened}
              onClick={toggleMobile}
            />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <nav className={classes.navigation} aria-label="Menu de Movilidad">
          {navigationItems.map((item) => {
            const isActive =
              item.path === '/movilidad'
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

            return (
              <Tooltip
                key={item.path}
                label={item.label}
                disabled={!sidebarCollapsed}
                position="right"
              >
                <UnstyledButton
                  component={NavLink}
                  to={item.path}
                  className={`${classes.navItem} ${isActive ? classes.navItemActive : ''}`}
                  onClick={() => {
                    if (mobileOpened) {
                      toggleMobile();
                    }
                  }}
                >
                  <span className={classes.navIcon}>{item.shortLabel}</span>
                  {!sidebarCollapsed && (
                    <Text className={classes.navLabel}>{item.label}</Text>
                  )}
                </UnstyledButton>
              </Tooltip>
            );
          })}
        </nav>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <Text className={classes.footerText}>
          CityPass+ | Movilidad Urbana Inteligente
        </Text>
      </AppShell.Footer>
    </AppShell>
  );
}
