import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { adminApi } from '../../api/resources.js';
import { useApi, usePagination } from '../../hooks/useApi.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  formatDate,
  humanize,
} from '../../components/ui.jsx';

const idOf = (record) => record?.id || record?._id;

const ACTIONS = [
  '',
  'AUTH_REGISTER',
  'AUTH_LOGIN',
  'ORG_APPROVED',
  'ORG_REJECTED',
  'ORG_SUSPENDED',
  'DONATION_CREATED',
  'DONATION_PUBLISHED',
  'DONATION_CANCELLED',
  'RESERVATION_CREATED',
  'RESERVATION_ACCEPTED',
  'RESERVATION_DECLINED',
  'PICKUP_ASSIGNED',
  'PICKUP_COLLECTED',
  'PICKUP_DELIVERED',
  'INCIDENT_CREATED',
  'INCIDENT_RESOLVED',
  'USER_SUSPENDED',
  'USER_ACTIVE',
];

/** Read-only audit trail: who did what, to which record, and when. */
export function AuditLogPage() {
  const { pagination, setPage } = usePagination({ page: 1, limit: 25 });
  const [filters, setFilters] = useState({ action: '', entityType: '', q: '' });
  const [applied, setApplied] = useState({ action: '', entityType: '', q: '' });
  const [detail, setDetail] = useState(null);

  const { data, error, loading, reload } = useApi(
    () =>
      adminApi.auditLogs({
        page: pagination.page,
        limit: pagination.limit,
        action: applied.action || undefined,
        entityType: applied.entityType || undefined,
        q: applied.q || undefined,
      }),
    [pagination.page, pagination.limit, applied]
  );

  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <div>
          <Badge variant={row.action?.includes('CANCEL') || row.action?.includes('SUSPEND') ? 'danger' : 'neutral'}>
            {row.action}
          </Badge>
          <div className="tiny muted">{humanize(row.action)}</div>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row) => (
        <div className="small">
          {row.actor?.name || 'system'}
          <div className="tiny muted">{row.actor?.email || row.actor?.role || ''}</div>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (row) => (
        <div className="small">
          {humanize(row.entityType)}
          <div className="mono tiny muted">{String(row.entityId || '').slice(-8) || '—'}</div>
        </div>
      ),
    },
    {
      key: 'when',
      header: 'When',
      render: (row) => <span className="small muted">{formatDate(row.createdAt, { withTime: true })}</span>,
    },
    {
      key: 'ip',
      header: 'Source',
      render: (row) => (
        <span className="tiny muted">
          {row.ip || '—'}
          {row.userAgent ? ` · ${String(row.userAgent).slice(0, 24)}…` : ''}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button size="sm" variant="ghost" onClick={() => setDetail(row)}>
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Audit log"
        subtitle="An append-only record of every consequential action: verification decisions, quantity changes, pickups, and resolutions."
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
            <Select
              label="Action"
              value={filters.action}
              onChange={(event) => setFilters((f) => ({ ...f, action: event.target.value }))}
              options={ACTIONS.map((action) => ({ value: action, label: action ? humanize(action) : 'All actions' }))}
            />
            <Select
              label="Entity type"
              value={filters.entityType}
              onChange={(event) => setFilters((f) => ({ ...f, entityType: event.target.value }))}
              options={[
                { value: '', label: 'All entities' },
                { value: 'Organization', label: 'Organization' },
                { value: 'Donation', label: 'Donation' },
                { value: 'Reservation', label: 'Reservation' },
                { value: 'PickupTask', label: 'Pickup task' },
                { value: 'Incident', label: 'Incident' },
                { value: 'User', label: 'User' },
                { value: 'PredictionLog', label: 'Prediction' },
              ]}
            />
            <Input
              label="Search"
              value={filters.q}
              onChange={(event) => setFilters((f) => ({ ...f, q: event.target.value }))}
              placeholder="Action or metadata text"
            />
            <div className="field">
              <span className="field-label">Apply</span>
              <div className="row">
                <Button type="submit" variant="primary" icon={Search}>
                  Filter
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const cleared = { action: '', entityType: '', q: '' };
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
          <Alert variant="danger" title="Audit log could not be loaded">
            {error.message}
          </Alert>
        </div>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title={`${data?.pagination?.total ?? 0} event${data?.pagination?.total === 1 ? '' : 's'}`}
          subtitle="Newest first. Entries are never edited or deleted."
          action={
            <Button variant="ghost" size="sm" onClick={reload}>
              Refresh
            </Button>
          }
        />

        {loading ? (
          <div className="card-body">
            <div className="skeleton skeleton-block" />
          </div>
        ) : data?.items?.length ? (
          <>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={columns} rows={data.items} caption="Audit trail" />
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
              icon={ScrollText}
              title="No audit events match"
              description="Audit entries are written automatically as records change. Adjust the filters to widen the search."
            />
          </div>
        )}
      </Card>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Audit event" size="lg">
        {detail ? (
          <div className="stack">
            <pre className="mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(detail, null, 2)}
            </pre>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default AuditLogPage;
