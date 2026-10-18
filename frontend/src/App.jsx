import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/AppLayout.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute.jsx';

import { PublicLayout } from './pages/public/PublicLayout.jsx';
import { LandingPage } from './pages/public/LandingPage.jsx';
import { AboutPage, FoodSafetyPage, HowItWorksPage } from './pages/public/StaticPages.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { RegisterPage } from './pages/auth/RegisterPage.jsx';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/auth/PasswordPages.jsx';
import { AccessDeniedPage, NotFoundPage } from './pages/public/ErrorPages.jsx';

import { DashboardPage } from './pages/DashboardPage.jsx';
import { MarketplacePage } from './pages/MarketplacePage.jsx';
import { DonationDetailPage } from './pages/donations/DonationDetailPage.jsx';
import { DonationFormPage } from './pages/donations/DonationFormPage.jsx';
import { MyDonationsPage } from './pages/donations/MyDonationsPage.jsx';
import { PredictionsPage } from './pages/PredictionsPage.jsx';
import { DemandRequestsPage } from './pages/DemandRequestsPage.jsx';
import { ReservationsPage } from './pages/ReservationsPage.jsx';
import { PickupDetailPage } from './pages/pickups/PickupDetailPage.jsx';
import { PickupsPage } from './pages/pickups/PickupsPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { ImpactPage } from './pages/ImpactPage.jsx';
import { OrganizationPage } from './pages/OrganizationPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

import { AdminOverviewPage } from './pages/admin/AdminOverviewPage.jsx';
import { VerificationQueuePage } from './pages/admin/VerificationQueuePage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { AdminDonationsPage } from './pages/admin/AdminDonationsPage.jsx';
import { AdminPickupsPage } from './pages/admin/AdminPickupsPage.jsx';
import { AdminIncidentsPage } from './pages/admin/AdminIncidentsPage.jsx';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage.jsx';
import { AuditLogPage } from './pages/admin/AuditLogPage.jsx';

/**
 * Route table.
 *
 * Access rules are declared here (role / organization type / verification) and
 * mirrored by the API — the UI hides what a user cannot do, and the server
 * refuses it regardless.
 */
export default function App() {
  return (
    <Routes>
      {/* Public marketing and policy pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/food-safety" element={<FoodSafetyPage />} />
      </Route>

      {/* Authentication */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/access-denied" element={<AccessDeniedPage />} />

      {/* Authenticated application */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/organization" element={<OrganizationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/pickups" element={<PickupsPage />} />
        <Route path="/pickups/:id" element={<PickupDetailPage />} />

        {/* Donor-only */}
        <Route
          path="/donations/new"
          element={
            <ProtectedRoute orgTypes={['DONOR']} requireVerified>
              <DonationFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donations/:id/edit"
          element={
            <ProtectedRoute orgTypes={['DONOR']} requireVerified>
              <DonationFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="/donations/mine" element={<MyDonationsPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />

        {/* Recipient-only */}
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route
          path="/demand-requests"
          element={
            <ProtectedRoute orgTypes={['RECIPIENT']}>
              <DemandRequestsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/donations/:id" element={<DonationDetailPage />} />

        {/* Administration */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/verification"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <VerificationQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/donations"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDonationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pickups"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminPickupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/incidents"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminIncidentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
