import { Alert, Button, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/providers/authContext';
import { demoCredentials } from '../../config/demoAuth';

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

export function LoginPage() {
  const [email, setEmail] = useState<string>(demoCredentials.email);
  const [password, setPassword] = useState<string>(demoCredentials.password);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LoginLocationState | null;
  const redirectTo = state?.from?.pathname ?? '/';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (login(email, password)) {
      navigate(redirectTo, { replace: true });
      return;
    }

    setError('Las credenciales demo no coinciden.');
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Title order={1}>Login</Title>
        <Text c="dimmed">
          Acceso hardcodeado temporal hasta integrar el modulo centralizado de
          autenticacion.
        </Text>
        <Alert color="blue" variant="light">
          Usuario demo: {demoCredentials.email} | Clave:{' '}
          {demoCredentials.password}
        </Alert>
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}
        <TextInput
          label="Correo electronico"
          placeholder="demo@citypass.com"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <PasswordInput
          label="Contrasena"
          placeholder="citypass123"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <Button type="submit" fullWidth>
          Ingresar
        </Button>
      </Stack>
    </form>
  );
}
