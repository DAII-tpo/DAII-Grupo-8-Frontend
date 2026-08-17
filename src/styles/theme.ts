import { createTheme } from '@mantine/core';

import { cityPassPalette } from './palette';

export const mantineTheme = createTheme({
  primaryColor: 'citypassUrbanBlue',
  colors: {
    citypassUrbanBlue: [
      '#eef4ff',
      '#d9e5f7',
      '#b3caef',
      '#89ace5',
      '#6894dc',
      '#5283d7',
      cityPassPalette.urbanBlue,
      '#274f91',
      '#21457f',
      '#1a3b6e',
    ],
    citypassUrbanGreen: [
      '#eef8f3',
      '#dcece5',
      '#bad8ca',
      '#95c2ad',
      '#78b196',
      '#64a687',
      cityPassPalette.urbanGreen,
      '#447762',
      '#3a6755',
      '#315747',
    ],
  },
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});
