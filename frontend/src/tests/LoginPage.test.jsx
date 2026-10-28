import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import App from '../App.jsx';

describe('LoginPage and Auth flow', () => {
  it('renders LoginPage without errors', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Sign in to Foodkind')).toBeDefined();
  });

  it('renders App at /login route without errors', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Sign in to Foodkind')).toBeDefined();
    });
  });

  it('navigates from / to /login when clicking sign in', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Rescue Surplus/i)).toBeDefined();
    });
    const signInLinks = screen.getAllByText('Sign in');
    expect(signInLinks.length).toBeGreaterThan(0);
    fireEvent.click(signInLinks[0]);
    await waitFor(() => {
      expect(screen.getByText('Sign in to Foodkind')).toBeDefined();
    });
  });
});
