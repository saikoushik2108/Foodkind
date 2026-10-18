import { useState } from 'react';
import { Search, ShieldOff, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminApi } from '../../api/resources.js';
import { useApi, usePagination } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Textarea,
  formatDate,
  humanize,
} from '../../components/ui.jsx';
import { MEMBERSHIP_ROLES, ORG_TYPES } from '../../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'ADMIN', label: 'Platform administrator' },
  { value: 'ORG_OWNER', label: 'Organization owner' },
  { value: 'ORG_MEMBER', label: 'Organization member' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
];

/** User administration: find accounts, suspend or reinstate them. */
export function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const [applied, setApplied] = useState({ q: '', role: '', status: '' });
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');

  const { data, error, loading, reload } = useApi(
    () =>
      adminApi.users({
        page: pagination.page,
        limit: pagination.limit,
        q: applied.q || undefined,
        role: applied.role || undefined,
        status: applied.status || undefined,
      }),
    [pagination.page, pagination.limit, applied]
  );

  async function setStatus(status) {
    if (!target) return;
    setBusy(true);
    try {
      await adminApi.setUserStatus(idOf(target), status, reason.trim());
      toast.success(`Account ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`);
      setTarget(null);
      setReason('');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'The change could not be saved' });
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (row) => (
        <div>
          <strong>{row.name}</strong>
          {idOf(row) === idOf(me) ? <span className="tiny muted"> (you)</span> : null}
          <div className="tiny muted">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (row) => (
        <div className="small">
          {row.organizationName || (typeof row.organization === 'string' ? <span className="mono tiny">{row.organization}</span> : '—')}
          <div className="tiny muted">
            {row.organizationType ? humanize(row.organizationType) : ''}
            {row.organizationVerificationStatus ? ` · ${humanize(row.organizationVerificationStatus)}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <div className="stack-sm">
          <Badge variant={row.role === 'ADMIN' ? 'brand' : 'neutral'}>{humanize(row.role)}</Badge>
          <span className="tiny muted">{humanize(row.membershipRole)}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'lastLogin',
      header: 'Last sign-in',
      render: (row) => <span className="small muted">{row.lastLoginAt ? formatDate(row.lastLoginAt, { withTime: true }) : 'never'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) =>
        idOf(row) === idOf(me) ? (
          <span className="tiny muted">Manage your account in settings</span>
        ) : (
          <div className="table-actions">
            {row.status === 'SUSPENDED' ? (
              <Button
                size="sm"
                variant="primary"
                icon={UserCheck}
                loading={busy}
                onClick={async () => {
                  try {
                    await adminApi.setUserStatus(idOf(row), 'ACTIVE', 'Reinstated by administrator');
                    toast.success('Account reactivated.');
                    reload();
                  } catch (err) {
                    toast.error(err.message);
                  }
                }}
              >
                Reactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline-danger"
                icon={ShieldOff}
                onClick={() => {
                  setTarget(row);
                  setReason('');
                }}
              >
                Suspend
              </Button>
            )}
          </div>
        ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="User management"
        subtitle="Accounts across every organization. Suspending an account ends its API access immediately."
      />

      <Card>
        <form
          className="card-body"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setApplied(filters);
          }}
        >
          <div className="form-grid">
            <Input
              label="Search by name or email"
              value={filters.q}
              onChange={(event) => setFilters((f) => ({ ...f, q: event.target.value }))}
              placeholder="e.g. canteen or owner@campus.edu"
            />
            <Select
              label="Role"
              value={filters.role}
              onChange={(event) => setFilters((f) => ({ ...f, role: event.target.value }))}
              options={ROLE_OPTIONS}
            />
            <Select
              label="Account status"
              value={filters.status}
              onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'PENDING', label: 'Pending' },
              ]}
            />
            <div className="field">
              <span className="field-label">Apply</span>
              <div className="row">
                <Button type="submit" variant="primary" icon={Search}>
                  Search
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const cleared = { q: '', role: '', status: '' };
                    setFilters(cleared);
                    setApplied(cleared);
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>

      {error ? (
        <div className="mt-4">
          <Alert variant="danger" title="Users could not be loaded">
            {error.message}
          </Alert>
        </div>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title={`${data?.pagination?.total ?? 0} account${data?.pagination?.total === 1 ? '' : 's'}`}
          subtitle={`Membership roles: ${MEMBERSHIP_ROLES.map(humanize).join(', ')}. Organization types: ${ORG_TYPES.map(humanize).join(', ')}.`}
        />

        {loading ? (
          <div className="card-body">
            <div className="skeleton skeleton-block" />
          </div>
        ) : data?.items?.length ? (
          <>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={columns} rows={data.items} caption="Platform user accounts" />
            </div>
            {data.pagination ? (
              <div className="card-body">
                <Pagination
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  total={data.pagination.total}
                  limit={data.pagination.limit}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="card-body">
            <EmptyState
              icon={Users}
              title="No accounts match"
              description="Try a broader search, or clear the filters to see every account."
            />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(target)}
        onCancel={() => setTarget(null)}
        onConfirm={() => setStatus('SUSPENDED')}
        title="Suspend this account?"
        confirmLabel="Suspend account"
        loading={busy}
      >
        <div className="stack-sm">
          <p className="small">
            <strong>{target?.name}</strong> ({target?.email}) will be signed out of new requests immediately and cannot
            sign in again until reinstated.
          </p>
          <Textarea
            label="Reason (required)"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint="Recorded in the audit log."
          />
          {reason.trim().length < 3 ? (
            <span className="field-error">Please give a reason of at least three characters.</span>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default AdminUsersPage;
