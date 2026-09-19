import { Alert, Button, Group, Text } from '@mantine/core';
import { AlertCircle, RefreshCw } from 'lucide-react';

import classes from './RetryErrorAlert.module.css';

type RetryErrorAlertProps = {
  message: string;
  onRetry: () => void;
  title: string;
};

export function RetryErrorAlert({ message, onRetry, title }: RetryErrorAlertProps) {
  return (
    <Alert color="red" icon={<AlertCircle size={18} />} title={title}>
      <Group className={classes.content} justify="space-between" align="center" gap="md" mt="xs">
        <Text size="sm">{message}</Text>
        <Button
          className={classes.retryButton}
          color="red"
          leftSection={<RefreshCw size={16} />}
          onClick={onRetry}
          variant="filled"
        >
          Reintentar
        </Button>
      </Group>
    </Alert>
  );
}
