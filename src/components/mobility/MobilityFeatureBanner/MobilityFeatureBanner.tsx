import { Group, Paper, Text, Title } from '@mantine/core';
import type { ComponentType } from 'react';

import classes from './MobilityFeatureBanner.module.css';

type MobilityFeatureBannerProps = {
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  title: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'sky';
};

export function MobilityFeatureBanner({ description, icon: Icon, label, title, tone = 'blue' }: MobilityFeatureBannerProps) {
  return (
    <Paper className={`${classes.banner} ${classes[tone]}`} radius="lg" p="lg">
      <Group gap="md" wrap="nowrap">
        <div className={classes.icon}><Icon size={25} strokeWidth={1.9} /></div>
        <div>
          <Text className={classes.label}>{label}</Text>
          <Title className={classes.title} order={2}>{title}</Title>
          <Text className={classes.description}>{description}</Text>
        </div>
      </Group>
    </Paper>
  );
}
