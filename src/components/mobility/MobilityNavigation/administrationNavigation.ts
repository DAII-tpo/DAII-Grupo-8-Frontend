import { AlertCircle, BarChart3, Bike, LayoutDashboard, MapPin, Truck, Wrench } from 'lucide-react';

export const administrationNavigationItems = [
  { tab: 'summary', label: 'Resumen', icon: LayoutDashboard },
  { tab: 'analytics', label: 'Analítica', icon: BarChart3 },
  { tab: 'incidents', label: 'Incidencias', icon: AlertCircle },
  { tab: 'maintenance', label: 'Mantenimiento', icon: Wrench },
  { tab: 'stations', label: 'Estaciones', icon: MapPin },
  { tab: 'restock', label: 'Reabastecimiento', icon: Truck },
  { tab: 'bikes', label: 'Bicicletas', icon: Bike },
];

export function administrationSection(search: string) {
  const tab = new URLSearchParams(search).get('tab');
  return administrationNavigationItems.find((item) => item.tab === tab) ?? administrationNavigationItems[0];
}
