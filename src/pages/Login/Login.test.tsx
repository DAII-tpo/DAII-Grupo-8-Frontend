import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../app/providers/authContext';
import { mantineTheme } from '../../styles/theme';
import { LoginPage } from './index';

vi.mock('../../app/providers/authContext', () => ({ useAuth: vi.fn() }));

const loginCitizen = vi.fn();
const registerCitizen = vi.fn();
const loginStaff = vi.fn();

function renderLogin() {
  return render(<MantineProvider theme={mantineTheme}><MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/movilidad" element={<div>Movilidad</div>} />
  </Routes></MemoryRouter></MantineProvider>);
}

function fillCitizenForm() {
  fireEvent.change(screen.getByTestId('citizen-email'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByTestId('citizen-password'), { target: { value: 'Password123' } });
}

function axiosError(status: number, code?: string): AxiosError {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    config: { headers: new AxiosHeaders() }, data: code ? { code } : {}, headers: {}, status, statusText: 'Error',
  });
}

beforeEach(() => {
  loginCitizen.mockReset().mockResolvedValue(undefined);
  registerCitizen.mockReset().mockResolvedValue(undefined);
  loginStaff.mockReset().mockResolvedValue(undefined);
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    isRestoring: false,
    login: loginCitizen,
    loginCitizen,
    registerCitizen,
    loginStaff,
    logout: vi.fn(),
    user: null,
  });
});

afterEach(cleanup);

describe('LoginPage', () => {
  it('renderiza el acceso ciudadano y permite iniciar sesión', async () => {
    renderLogin();
    expect(screen.getByRole('tab', { name: 'Acceso ciudadano' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Personal municipal' })).toBeInTheDocument();

    fillCitizenForm();
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(loginCitizen).toHaveBeenCalledWith('ana@example.com', 'Password123'));
    expect(await screen.findByText('Movilidad')).toBeInTheDocument();
  });

  it('muestra mensajes seguros para credenciales inválidas y cuenta bloqueada', async () => {
    loginCitizen.mockRejectedValueOnce(axiosError(401, 'INVALID_CREDENTIALS'));
    renderLogin();
    fillCitizenForm();
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Email o contraseña inválidos.')).toBeInTheDocument();

    loginCitizen.mockRejectedValueOnce(axiosError(423, 'ACCOUNT_LOCKED'));
    fillCitizenForm();
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText(/temporalmente bloqueada/i)).toBeInTheDocument();
  });

  it('valida la contraseña y registra automáticamente al ciudadano', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    const panel = within(screen.getByRole('tabpanel'));
    const createButton = panel.getByRole('button', { name: 'Crear cuenta' });
    expect(createButton).toBeDisabled();
    fireEvent.change(screen.getByTestId('register-first-name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByTestId('register-last-name'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByTestId('register-email'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByTestId('register-password'), { target: { value: 'Password123' } });
    fireEvent.click(createButton);

    await waitFor(() => expect(registerCitizen).toHaveBeenCalledWith('ana@example.com', 'Password123', 'Ana', 'Pérez'));
    expect(await screen.findByText('Movilidad')).toBeInTheDocument();
  });

  it('informa si el email ya está registrado', async () => {
    registerCitizen.mockRejectedValueOnce(axiosError(409, 'EMAIL_ALREADY_REGISTERED'));
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    const panel = within(screen.getByRole('tabpanel'));
    fireEvent.change(screen.getByTestId('register-first-name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByTestId('register-last-name'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByTestId('register-email'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByTestId('register-password'), { target: { value: 'Password123' } });
    fireEvent.click(panel.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ya existe una cuenta registrada con ese email.')).toBeInTheDocument();
  });

  it('permite el ingreso STAFF y muestra un error genérico del IdP', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: 'Personal municipal' }));
    const panel = within(screen.getByRole('tabpanel'));
    fireEvent.change(screen.getByTestId('staff-username'), { target: { value: 'operador' } });
    fireEvent.change(screen.getByTestId('staff-password'), { target: { value: 'secret' } });
    fireEvent.click(panel.getByRole('button', { name: 'Ingresar como personal' }));
    await waitFor(() => expect(loginStaff).toHaveBeenCalledWith('operador', 'secret'));
    expect(await screen.findByText('Movilidad')).toBeInTheDocument();
  });

  it('no revela detalles cuando el IdP rechaza credenciales', async () => {
    loginStaff.mockRejectedValueOnce(axiosError(401));
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: 'Personal municipal' }));
    const panel = within(screen.getByRole('tabpanel'));
    fireEvent.change(screen.getByTestId('staff-username'), { target: { value: 'operador' } });
    fireEvent.change(screen.getByTestId('staff-password'), { target: { value: 'secret' } });
    fireEvent.click(panel.getByRole('button', { name: 'Ingresar como personal' }));
    expect(await screen.findByText('Usuario o contraseña inválidos.')).toBeInTheDocument();
  });
});
