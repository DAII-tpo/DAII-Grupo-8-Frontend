import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';

import { mantineTheme } from '../../styles/theme';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <MantineProvider theme={mantineTheme}>{children}</MantineProvider>;
}
