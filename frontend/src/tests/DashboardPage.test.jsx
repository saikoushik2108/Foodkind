import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';

function renderDashboardWithAuth(authOverrides = {}) {
  const defaultAuth = {
    user: { id: 'u1', name: 'Volunteer Alice', role: 'MEMBER', membershipRole: 'VOLUNTEER' },
    organization: { id: 'o1', name: 'Volunteer Squad', type: 'PARTNER', verificationStatus: 'APPROVED' },
    role: 'MEMBER',
    status: 'authenticated',
    isAuthenticated: true,
    isLoading: false,
    isAdmin: false,
    isDonor: false,
    isRecipient: false,
    isPartner: true,
    isVolunteer: true,
    isAgent: true,
    isVerified: true,
    ...authOverrides,
  };

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ToastProvider>
        <AuthContext.Provider value={defaultAuth}>
          <DashboardPage />
        </AuthContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('DashboardPage rendering and role states', () => {
  it('renders without throwing ReferenceError for volunteer role', async () => {
    const { container } = renderDashboardWithAuth();
    expect(container).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Volunteer/i)).toBeDefined();
    });
  });

  it('renders for donor role without errors', async () => {
    const { container } = renderDashboardWithAuth({
      user: { id: 'u2', name: 'Donor Bob', role: 'MEMBER' },
      organization: { id: 'o2', name: 'Canteen Kitchen', type: 'DONOR', verificationStatus: 'APPROVED' },
      isDonor: true,
      isRecipient: false,
      isPartner: false,
      isVolunteer: false,
      isAgent: false,
    });
    expect(container).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Donor/i)).toBeDefined();
    });
  });

  it('renders for recipient role without errors', async () => {
    const { container } = renderDashboardWithAuth({
      user: { id: 'u3', name: 'Recipient Carol', role: 'MEMBER' },
      organization: { id: 'o3', name: 'Hope Shelter', type: 'RECIPIENT', verificationStatus: 'APPROVED' },
      isDonor: false,
      isRecipient: true,
      isPartner: false,
      isVolunteer: false,
      isAgent: false,
    });
    expect(container).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Recipient/i)).toBeDefined();
    });
  });
});
