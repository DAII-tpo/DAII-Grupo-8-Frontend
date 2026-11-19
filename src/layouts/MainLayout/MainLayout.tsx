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
import { LogOut, Menu, Settings, ShieldCheck, User, X } from 'lucide-react';
import type { ComponentType } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/providers/authContext';
import { administrationNavigationItems, administrationSection } from '../../components/mobility/MobilityNavigation/administrationNavigation';
import { mobilityNavigationItems } from '../../components/mobility/MobilityNavigation';
import { BrandLogo } from '../../components/common/BrandLogo';
import { ClimateAlertBanner } from '../../components/mobility/ClimateAlertBanner/ClimateAlertBanner';
import { canAccessAdministration, getDisplayName, type AuthUser } from '../../types/auth';

import classes from './MainLayout.module.css';

type NavigationItem = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  path: string;
  action?: 'logout';
  tab?: string;
};

const accountNavigationItems: NavigationItem[] = [
  { icon: User, label: 'Mi Cuenta', path: '/mi-cuenta' },
  { icon: Settings, label: 'Configuración', path: '/configuracion' },
  { icon: LogOut, label: 'Cerrar Sesión', path: '/login', action: 'logout' },
];

const managementNavigationItems: NavigationItem[] = [
  {
    icon: ShieldCheck,
    label: 'Administración',
    path: '/movilidad/administracion',
  },
];

export function MainLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
  const [sidebarOpened, { toggle: toggleSidebar }] = useDisclosure(true);
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdministration = location.pathname === '/movilidad/administracion';
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
            <Text className={classes.headerTitle} visibleFrom="sm">Movilidad urbana</Text>
          </Group>
          <Group className={classes.userSummary} gap="sm" wrap="nowrap">
            <Avatar className={classes.avatar} radius="xl">UD</Avatar>
            <div className={classes.userCopy}>
              <Text className={classes.userName}>{getDisplayName(user)}</Text>
              <Text className={classes.userRole}>{roleLabel(user)}</Text>
            </div>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <nav className={classes.navigation} aria-label="Menu principal CityPass+">
          <div className={classes.sidebarBrand}>
            <BrandLogo compact />
          </div>
          <Text className={classes.sectionLabel}>Movilidad</Text>
          <div className={classes.navSection}>
            {mobilityNavigationItems.map((item) => (
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
          {canAccessAdministration(user) ? (
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
                {isAdministration && (
                  <div className={classes.adminNavigation} role="group" aria-label="Secciones de administración">
                    {administrationNavigationItems.map((item) => (
                      <NavigationLink
                        key={item.tab}
                        item={{ ...item, path: `/movilidad/administracion?tab=${item.tab}` }}
                        pathname={location.pathname}
                        search={location.search}
                        onNavigate={() => { if (mobileOpened) toggleMobile(); }}
                      />
                    ))}
                  </div>
                )}
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
                  if (item.action === 'logout') {
                    void logout().finally(() => { void navigate('/login', { replace: true }); });
                    return;
                  }

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
        {location.pathname === '/movilidad' || location.pathname.startsWith('/movilidad/')
          ? <ClimateAlertBanner /> : null}
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <Text className={classes.footerText}>
          © 2026 CityPass+ · Movilidad urbana
        </Text>
      </AppShell.Footer>
    </AppShell>
  );
}

type NavigationLinkProps = {
  item: NavigationItem;
  onNavigate: () => void;
  pathname: string;
  search?: string;
};

function NavigationLink({ item, onNavigate, pathname, search = '' }: Readonly<NavigationLinkProps>) {
  const Icon = item.icon;
  let isActive = pathname === item.path || pathname.startsWith(item.path + '/');
  if (item.path === '/movilidad') isActive = pathname === '/' || pathname === item.path;
  if (item.path === '/movilidad/bicicletas' && pathname === '/movilidad/viaje-activo') isActive = true;

  if (item.tab) isActive = pathname === '/movilidad/administracion' &&
    administrationSection(search).tab === item.tab;

  return (
    <Tooltip label={item.label} disabled position="right">
      <UnstyledButton
        component={Link}
        to={item.path}
        aria-current={isActive ? 'page' : undefined}
        className={`${classes.navItem} ${isActive ? classes.navItemActive : ''}`}
        onClick={onNavigate}
      >
        <Icon size={18} strokeWidth={2} />
        <Text className={classes.navLabel}>{item.label}</Text>
      </UnstyledButton>
    </Tooltip>
  );
}

function roleLabel(user: AuthUser | null): string {
  if (user?.role === 'ADMIN') return 'Administrador';
  if (user?.type === 'STAFF') return 'Personal municipal';
  return 'Ciudadano';
}
