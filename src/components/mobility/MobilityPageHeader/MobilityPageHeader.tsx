import { Group, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

import classes from './MobilityPageHeader.module.css';

type MobilityPageHeaderProps = {
  action?: ReactNode;
  subtitle: string;
  title: string;
};

export function MobilityPageHeader({ action, subtitle, title }: MobilityPageHeaderProps) {
  return (
    <Group align="flex-end" className={classes.header} justify="space-between" gap="md">
      <div>
        <Text className={classes.eyebrow}>Movilidad urbana</Text>
        <Title className={classes.title} order={1}>{title}</Title>
        <Text className={classes.subtitle}>{subtitle}</Text>
      </div>
      {action ? <div className={classes.action}>{action}</div> : null}
    </Group>
  );
}
