import { Bike, CalendarDays, History, Home, Map, MapPin, MessageSquare } from 'lucide-react';

export const mobilityNavigationItems = [
  { icon: Home, label: 'Inicio', path: '/movilidad' },
  { icon: Map, label: 'Mapa', path: '/movilidad/mapa' },
  { icon: MapPin, label: 'Estaciones', path: '/movilidad/estaciones' },
  { icon: CalendarDays, label: 'Eventos', path: '/movilidad/eventos' },
  { icon: Bike, label: 'Bicicletas/Viajes', path: '/movilidad/bicicletas' },
  { icon: History, label: 'Historial', path: '/movilidad/historial' },
  { icon: MessageSquare, label: 'Reportes', path: '/movilidad/reportes' },
];
