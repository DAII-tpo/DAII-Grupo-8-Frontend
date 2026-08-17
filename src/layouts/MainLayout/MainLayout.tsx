import {
  ActionIcon,
  AppShell,
  Group,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  BarChart3,
  Bike,
  CalendarDays,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Siren,
  Trees,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/providers/authContext';
import { BrandLogo } from '../../components/common/BrandLogo';

import classes from './MainLayout.module.css';

type NavigationItem = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  path: string;
  action?: 'logout';
};

const moduleNavigationItems: NavigationItem[] = [
  { icon: Home, label: 'Inicio', path: '/' },
  { icon: Bike, label: 'Movilidad', path: '/movilidad' },
  { icon: Trash2, label: 'Residuos', path: '/residuos' },
  { icon: MessageSquare, label: 'Reclamos', path: '/reclamos' },
  { icon: Siren, label: 'Emergencias', path: '/emergencias' },
  { icon: Trees, label: 'Espacios Públicos', path: '/espacios-publicos' },
  {
    icon: CalendarDays,
    label: 'Cultura y Eventos',
    path: '/cultura-eventos',
  },
  { icon: BarChart3, label: 'Analítica', path: '/analitica' },
];

const accountNavigationItems: NavigationItem[] = [
  { icon: User, label: 'Mi Cuenta', path: '/mi-cuenta' },
  { icon: Settings, label: 'Configuración', path: '/configuracion' },
  { icon: LogOut, label: 'Cerrar Sesión', path: '/login', action: 'logout' },
];

export function MainLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
  const [sidebarOpened, { toggle: toggleSidebar }] = useDisclosure(false);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const menuIcon = sidebarOpened ? <X size={28} /> : <Menu size={32} />;
  const mobileMenuIcon = mobileOpened ? <X size={28} /> : <Menu size={32} />;

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{
        width: 248,
        breakpoint: 'sm',
        collapsed: { desktop: !sidebarOpened, mobile: !mobileOpened },
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
        <Group className={classes.headerContent} gap="md">
          <Tooltip label={sidebarOpened ? 'Ocultar menu' : 'Mostrar menu'}>
            <ActionIcon
              aria-label="Alternar menu lateral"
              className={classes.menuButton}
              variant="filled"
              visibleFrom="sm"
              onClick={toggleSidebar}
            >
              {menuIcon}
            </ActionIcon>
          </Tooltip>
          <ActionIcon
            aria-label="Abrir menu lateral"
            className={classes.menuButton}
            variant="filled"
            hiddenFrom="sm"
            onClick={toggleMobile}
          >
            {mobileMenuIcon}
          </ActionIcon>
          <BrandLogo />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <nav className={classes.navigation} aria-label="Menu principal CityPass+">
          <div className={classes.navSection}>
            {moduleNavigationItems.map((item) => (
              <NavigationLink
                key={item.path}
                item={item}
                pathname={location.pathname}
                onNavigate={() => {
                  if (item.action === 'logout') {
                    logout();
                    navigate('/login', { replace: true });
                  }

                  if (mobileOpened) {
                    toggleMobile();
                  }
                }}
              />
            ))}
          </div>
          <div className={classes.accountSection}>
            {accountNavigationItems.map((item) => (
              <NavigationLink
                key={item.path}
                item={item}
                pathname={location.pathname}
                onNavigate={() => {
                  if (mobileOpened) {
                    toggleMobile();
                  }
                }}
              />
            ))}
          </div>
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

type NavigationLinkProps = {
  item: NavigationItem;
  onNavigate: () => void;
  pathname: string;
};

function NavigationLink({ item, onNavigate, pathname }: NavigationLinkProps) {
  const Icon = item.icon;
  const isActive =
    item.path === '/'
      ? pathname === item.path
      : item.path === '/movilidad'
        ? pathname === item.path
          || pathname.startsWith('/movilidad/')
        : pathname.startsWith(item.path);

  return (
    <Tooltip label={item.label} disabled position="right">
      <UnstyledButton
        component={NavLink}
        to={item.path}
        className={`${classes.navItem} ${isActive ? classes.navItemActive : ''}`}
        onClick={onNavigate}
      >
        <Icon size={18} strokeWidth={2} />
        <Text className={classes.navLabel}>{item.label}</Text>
      </UnstyledButton>
    </Tooltip>
  );
}
