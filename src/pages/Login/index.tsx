import { Alert, Button, PasswordInput, Stack, Tabs, Text, TextInput, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import type { SubmitEvent } from 'react';
import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/providers/authContext';

import classes from './Login.module.css';

type AuthFlow = 'citizen' | 'register' | 'staff';
type SubmitAction = () => Promise<void>;

const passwordPattern = /^(?=.{10,72}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/;

export function LoginPage() {
  const { loginCitizen, loginStaff, registerCitizen } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmitLocked = useRef(false);

  const submit = async (flow: AuthFlow, action: SubmitAction) => {
    if (isSubmitLocked.current) return;

    isSubmitLocked.current = true;
    setError(null);
    setIsSubmitting(true);
    try {
      await action();
      await navigate(redirectPath(location.state), { replace: true });
    } catch (cause) {
      setError(authErrorMessage(cause, flow));
    } finally {
      isSubmitLocked.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Stack className={classes.login} gap="md">
      <div>
        <Title className={classes.title} order={1}>Ingrese a su cuenta</Title>
        <Text className={classes.subtitle}>Plataforma de Servicios Urbanos Inteligentes</Text>
      </div>
      {error ? <Alert color="red" title="No pudimos completar el acceso">{error}</Alert> : null}
      <Tabs className={classes.tabs} defaultValue="citizen" onChange={() => setError(null)}>
        <Tabs.List className={classes.tabsList}>
          <Tabs.Tab className={classes.tab} value="citizen">Acceso ciudadano</Tabs.Tab>
          <Tabs.Tab className={classes.tab} value="register">Crear cuenta</Tabs.Tab>
          <Tabs.Tab className={classes.tab} value="staff">Personal municipal</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel pt="md" value="citizen">
          <CitizenForm isSubmitting={isSubmitting} onSubmit={(email, password) => submit('citizen', () => loginCitizen(email, password))} />
        </Tabs.Panel>
        <Tabs.Panel pt="md" value="register">
          <RegisterForm isSubmitting={isSubmitting} onSubmit={(email, password, firstName, lastName) => submit('register', () => registerCitizen(email, password, firstName, lastName))} />
        </Tabs.Panel>
        <Tabs.Panel pt="md" value="staff">
          <StaffForm isSubmitting={isSubmitting} onSubmit={(username, password) => submit('staff', () => loginStaff(username, password))} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function CitizenForm({ isSubmitting, onSubmit }: Readonly<{ isSubmitting: boolean; onSubmit: (email: string, password: string) => Promise<void> }>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(email, password).catch(() => undefined);
  };

  return <form className={classes.form} onSubmit={handleSubmit}><Stack gap="lg">
    <TextInput autoComplete="email" data-testid="citizen-email" label="Usuario" onChange={(event) => setEmail(event.currentTarget.value)} placeholder="nombre@ejemplo.com" required type="email" value={email} />
    <PasswordInput autoComplete="current-password" data-testid="citizen-password" label="Contraseña" onChange={(event) => setPassword(event.currentTarget.value)} placeholder="••••••••" required value={password} />
    <a className={classes.forgotPassword} href="#recuperar-contrasena">¿Olvidaste tu contraseña?</a>
    <Button className={classes.submitButton} loading={isSubmitting} type="submit">Ingresar</Button>
  </Stack></form>;
}

function RegisterForm({ isSubmitting, onSubmit }: Readonly<{ isSubmitting: boolean; onSubmit: (email: string, password: string, firstName: string, lastName: string) => Promise<void> }>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const isPasswordValid = passwordPattern.test(password);
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPasswordValid) return;
    onSubmit(email, password, firstName, lastName).catch(() => undefined);
  };

  return <form className={classes.form} onSubmit={handleSubmit}><Stack gap="lg">
    <TextInput autoComplete="given-name" data-testid="register-first-name" label="Nombre" onChange={(event) => setFirstName(event.currentTarget.value)} required value={firstName} />
    <TextInput autoComplete="family-name" data-testid="register-last-name" label="Apellido" onChange={(event) => setLastName(event.currentTarget.value)} required value={lastName} />
    <TextInput autoComplete="email" data-testid="register-email" label="Correo electrónico" onChange={(event) => setEmail(event.currentTarget.value)} required type="email" value={email} />
    <PasswordInput autoComplete="new-password" data-testid="register-password" description="De 10 a 72 caracteres, con mayúscula, minúscula y número, sin espacios." error={password && !isPasswordValid ? 'La contraseña no cumple los requisitos.' : undefined} label="Contraseña" onChange={(event) => setPassword(event.currentTarget.value)} placeholder="••••••••" required value={password} />
    <Button className={classes.submitButton} disabled={!isPasswordValid} loading={isSubmitting} type="submit">Crear cuenta</Button>
  </Stack></form>;
}

function StaffForm({ isSubmitting, onSubmit }: Readonly<{ isSubmitting: boolean; onSubmit: (username: string, password: string) => Promise<void> }>) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(username, password).catch(() => undefined);
  };

  return <form className={classes.form} onSubmit={handleSubmit}><Stack gap="lg">
    <TextInput autoComplete="username" data-testid="staff-username" label="Usuario" onChange={(event) => setUsername(event.currentTarget.value)} required value={username} />
    <PasswordInput autoComplete="current-password" data-testid="staff-password" label="Contraseña" onChange={(event) => setPassword(event.currentTarget.value)} placeholder="••••••••" required value={password} />
    <Button className={classes.submitButton} loading={isSubmitting} type="submit">Ingresar como personal</Button>
  </Stack></form>;
}

function redirectPath(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/movilidad';
  const from = state.from;
  if (!from || typeof from !== 'object' || !('pathname' in from) || typeof from.pathname !== 'string') return '/movilidad';
  return from.pathname.startsWith('/') ? from.pathname : '/movilidad';
}

function authErrorMessage(error: unknown, flow: AuthFlow): string {
  const code = errorCode(error);
  if (flow === 'staff') {
    return code === 'INVALID_STAFF' || error instanceof Error && error.message === 'INVALID_STAFF'
      ? 'Esta cuenta no tiene acceso al módulo Movilidad.'
      : 'Usuario o contraseña inválidos.';
  }
  if (code === 'ACCOUNT_LOCKED') return 'Tu cuenta está temporalmente bloqueada. Intentá nuevamente más tarde.';
  if (flow === 'register' && code === 'EMAIL_ALREADY_REGISTERED') return 'Ya existe una cuenta registrada con ese email.';
  if (flow === 'register' && isAxiosError(error) && error.response?.status === 409) return 'Ya existe una cuenta registrada con ese email.';
  if (code === 'VALIDATION_ERROR' || (isAxiosError(error) && error.response?.status === 400)) return 'Revisá los datos ingresados.';
  return flow === 'register' ? 'No se pudo crear la cuenta. Intentá nuevamente.' : 'Email o contraseña inválidos.';
}

function errorCode(error: unknown): string | null {
  if (!isAxiosError(error) || !error.response?.data || typeof error.response.data !== 'object') return null;
  const data = error.response.data;
  return 'code' in data && typeof data.code === 'string' ? data.code : null;
}
