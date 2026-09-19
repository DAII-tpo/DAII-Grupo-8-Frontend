import {
  ActionIcon,
  AppShell,
  Avatar,
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
  ShieldCheck,
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
import { env } from '../../config/env';

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

const managementNavigationItems: NavigationItem[] = [
  {
    icon: ShieldCheck,
    label: 'Movilidad',
    path: '/movilidad/administracion',
  },
];

export function MainLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
  const [sidebarOpened, { toggle: toggleSidebar }] = useDisclosure(true);
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
        <Group className={classes.headerContent} justify="space-between" gap="md">
          <Group gap="md">
            <Tooltip label={sidebarOpened ? 'Ocultar menú' : 'Mostrar menú'}>
              <ActionIcon
                aria-label="Alternar menú lateral"
                className={classes.menuButton}
                variant="subtle"
                visibleFrom="sm"
                onClick={toggleSidebar}
              >
                {menuIcon}
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              aria-label="Abrir menú lateral"
              className={classes.menuButton}
              variant="subtle"
              hiddenFrom="sm"
              onClick={toggleMobile}
            >
              {mobileMenuIcon}
            </ActionIcon>
            <div className={classes.mobileBrand}>
              <BrandLogo compact />
            </div>
            <Text className={classes.headerTitle} visibleFrom="sm">Servicios de la ciudad</Text>
          </Group>
          <Group className={classes.userSummary} gap="sm" wrap="nowrap">
            <Avatar className={classes.avatar} radius="xl">UD</Avatar>
            <div className={classes.userCopy}>
              <Text className={classes.userName}>Usuario demo</Text>
              <Text className={classes.userRole}>{env.demoUserRole === 'ADMIN' ? 'Administrador' : 'Ciudadano'}</Text>
            </div>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <nav className={classes.navigation} aria-label="Menu principal CityPass+">
          <div className={classes.sidebarBrand}>
            <BrandLogo compact />
          </div>
          <Text className={classes.sectionLabel}>Servicios</Text>
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
          {env.demoUserRole === 'ADMIN' ? (
            <>
              <Text className={classes.sectionLabel}>Gestión</Text>
              <div className={classes.managementSection}>
                {managementNavigationItems.map((item) => (
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
            </>
          ) : null}
          <Text className={classes.sectionLabel}>Cuenta</Text>
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
          © 2026 CityPass+ · Servicios urbanos en un solo lugar
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
        ? (pathname === item.path
          || pathname.startsWith('/movilidad/'))
          && !pathname.startsWith('/movilidad/administracion')
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
