import { Paper, Stack, Text, Title } from '@mantine/core';

import classes from './PlaceholderPage.module.css';

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({
  title,
  description = 'Pantalla en construccion.',
}: PlaceholderPageProps) {
  return (
    <Paper className={classes.container} radius="md" p="xl">
      <Stack gap="xs">
        <Title className={classes.title} order={1}>
          {title}
        </Title>
        <Text className={classes.description}>{description}</Text>
      </Stack>
    </Paper>
  );
}
