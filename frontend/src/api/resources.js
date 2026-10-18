/**
 * API resource wrappers.
 *
 * Pages import these instead of touching axios, so endpoint paths and the
 * response envelope live in exactly one place.
 */
import { api, unwrap, unwrapList, toQuery } from './client.js';

/* ── Authentication ──────────────────────────────────────────────────── */
export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then(unwrap),
  login: (payload) => api.post('/auth/login', payload).then(unwrap),
  logout: () => api.post('/auth/logout', {}).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(unwrap),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then(unwrap),
  changePassword: (payload) => api.post('/auth/change-password', payload).then(unwrap),
};

/* ── Organizations ───────────────────────────────────────────────────── */
export const organizationApi = {
  mine: () => api.get('/organizations/me').then(unwrap),
  updateMine: (payload) => api.patch('/organizations/me', payload).then(unwrap),
  resubmit: () => api.post('/organizations/resubmit', {}).then(unwrap),
  list: (params) => api.get(`/organizations${toQuery(params)}`).then(unwrapList),
  get: (id) => api.get(`/organizations/${id}`).then(unwrap),
  donations: (id, params) => api.get(`/organizations/${id}/donations${toQuery(params)}`).then(unwrapList),
  uploadDocument: (formData) =>
    api
      .post('/organizations/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(unwrap),
};

/* ── Donations ───────────────────────────────────────────────────────── */
export const donationApi = {
  list: (params) => api.get(`/donations${toQuery(params)}`).then(unwrapList),
  mine: (params) => api.get(`/donations/mine${toQuery(params)}`).then(unwrapList),
  get: (id) => api.get(`/donations/${id}`).then(unwrap),
  create: (payload) => api.post('/donations', payload).then(unwrap),
  update: (id, payload) => api.patch(`/donations/${id}`, payload).then(unwrap),
  publish: (id) => api.post(`/donations/${id}/publish`, {}).then(unwrap),
  cancel: (id, reason) => api.post(`/donations/${id}/cancel`, { reason }).then(unwrap),
  matches: (id, params) =>
    api.get(`/donations/${id}/matches${toQuery(params)}`).then((res) => ({
      items: res.data?.data ?? [],
      notice: res.data?.notice ?? null,
    })),
  confirmActual: (id, actualQuantity) => api.post(`/donations/${id}/actual`, { actualQuantity }).then(unwrap),
  reserve: (id, payload) => api.post(`/donations/${id}/reservations`, payload).then(unwrap),
};

/* ── Reservations ────────────────────────────────────────────────────── */
export const reservationApi = {
  mine: (params) => api.get(`/reservations/mine${toQuery(params)}`).then(unwrapList),
  get: (id) => api.get(`/reservations/${id}`).then(unwrapList),
  accept: (id) => api.post(`/reservations/${id}/accept`, {}).then(unwrap),
  decline: (id, reason) => api.post(`/reservations/${id}/decline`, { reason }).then(unwrap),
  cancel: (id, reason) => api.post(`/reservations/${id}/cancel`, { reason }).then(unwrap),
  createPickup: (id, payload) => api.post(`/reservations/${id}/pickup`, payload).then(unwrap),
};

/* ── Demand requests ─────────────────────────────────────────────────── */
export const demandApi = {
  create: (payload) => api.post('/demand-requests', payload).then(unwrap),
  mine: (params) => api.get(`/demand-requests/mine${toQuery(params)}`).then(unwrapList),
  open: (params) => api.get(`/demand-requests/open${toQuery(params)}`).then(unwrapList),
  forecast: (params) => api.get(`/demand-requests/forecast${toQuery(params)}`).then(unwrap),
  get: (id) => api.get(`/demand-requests/${id}`).then(unwrap),
  update: (id, payload) => api.patch(`/demand-requests/${id}`, payload).then(unwrap),
  cancel: (id) => api.post(`/demand-requests/${id}/cancel`, {}).then(unwrap),
};

/* ── Pickups ─────────────────────────────────────────────────────────── */
export const pickupApi = {
  mine: (params) => api.get(`/pickups/mine${toQuery(params)}`).then(unwrapList),
  get: (id) => api.get(`/pickups/${id}`).then(unwrapList),
  assign: (id, assignedTo) => api.post(`/pickups/${id}/assign`, { assignedTo }).then(unwrap),
  confirmArrival: (id) => api.post(`/pickups/${id}/confirm-arrival`, {}).then(unwrap),
  verifyPickup: (id, code) => api.post(`/pickups/${id}/verify-pickup`, { code }).then(unwrap),
  confirmDelivery: (id, payload) => api.post(`/pickups/${id}/confirm-delivery`, payload).then(unwrap),
  reportIssue: (id, payload) => api.post(`/pickups/${id}/report-issue`, payload).then(unwrap),
};

/* ── Predictions ─────────────────────────────────────────────────────── */
export const predictionApi = {
  surplus: (payload) => api.post('/predictions/surplus', payload).then(unwrap),
  history: (params) => api.get(`/predictions/history${toQuery(params)}`).then(unwrapList),
  recordActual: (id, actualQuantity) => api.post(`/predictions/${id}/actual`, { actualQuantity }).then(unwrap),
  metrics: (params) => api.get(`/predictions/metrics${toQuery(params)}`).then(unwrap),
};

/* ── Notifications ───────────────────────────────────────────────────── */
export const notificationApi = {
  list: (params) => api.get(`/notifications${toQuery(params)}`).then(unwrapList),
  markRead: (id) => api.patch(`/notifications/${id}/read`, {}).then(unwrap),
  markAllRead: () => api.post('/notifications/read-all', {}).then(unwrap),
};

/* ── Analytics ───────────────────────────────────────────────────────── */
export const analyticsApi = {
  overview: (params) => api.get(`/analytics/overview${toQuery(params)}`).then(unwrap),
  donations: (params) => api.get(`/analytics/donations${toQuery(params)}`).then(unwrap),
  impact: (params) => api.get(`/analytics/impact${toQuery(params)}`).then(unwrap),
  forecast: (params) => api.get(`/analytics/forecast${toQuery(params)}`).then(unwrap),
  pickups: (params) => api.get(`/analytics/pickups${toQuery(params)}`).then(unwrap),
  organizations: (params) => api.get(`/analytics/organizations${toQuery(params)}`).then(unwrap),
  exportUrl: (params) => `/api/v1/analytics/export${toQuery(params)}`,
};

/* ── Incidents ───────────────────────────────────────────────────────── */
export const incidentApi = {
  create: (payload) => api.post('/incidents', payload).then(unwrap),
  mine: (params) => api.get(`/incidents/mine${toQuery(params)}`).then(unwrapList),
  trace: (donationId) => api.get(`/incidents/trace${toQuery({ donationId })}`).then(unwrap),
};

/* ── Uploads ─────────────────────────────────────────────────────────── */
export const uploadApi = {
  images: (formData) =>
    api.post('/uploads/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  aiSuggest: (formData) =>
    api.post('/uploads/ai-suggest', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  config: () => api.get('/uploads/config').then(unwrap),
};

/* ── Administration ──────────────────────────────────────────────────── */
export const adminApi = {
  overview: () => api.get('/admin/overview').then(unwrap),
  pendingOrganizations: (params) => api.get(`/admin/organizations/pending${toQuery(params)}`).then(unwrapList),
  organizations: (params) => api.get(`/admin/organizations${toQuery(params)}`).then(unwrapList),
  approveOrganization: (id, reason = '') => api.post(`/admin/organizations/${id}/approve`, { reason }).then(unwrap),
  rejectOrganization: (id, reason) => api.post(`/admin/organizations/${id}/reject`, { reason }).then(unwrap),
  suspendOrganization: (id, reason) => api.post(`/admin/organizations/${id}/suspend`, { reason }).then(unwrap),
  users: (params) => api.get(`/admin/users${toQuery(params)}`).then(unwrapList),
  setUserStatus: (id, status, reason = '') =>
    api.post(`/admin/users/${id}/status`, { status, reason }).then(unwrap),
  donations: (params) => api.get(`/admin/donations${toQuery(params)}`).then(unwrapList),
  cancelDonation: (id, reason, releaseDonation = true) =>
    api.post(`/admin/donations/${id}/cancel`, { reason, releaseDonation }).then(unwrap),
  traceDonation: (id) => api.get(`/admin/donations/${id}/trace`).then(unwrap),
  pickups: (params) => api.get(`/admin/pickups${toQuery(params)}`).then(unwrapList),
  incidents: (params) => api.get(`/admin/incidents${toQuery(params)}`).then(unwrapList),
  resolveIncident: (id, payload) => api.post(`/admin/incidents/${id}/resolve`, payload).then(unwrap),
  auditLogs: (params) => api.get(`/admin/audit-logs${toQuery(params)}`).then(unwrapList),
  config: () => api.get('/admin/config').then(unwrap),
  impact: (params) => api.get(`/admin/analytics/impact${toQuery(params)}`).then(unwrap),
};
