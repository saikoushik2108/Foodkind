import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileWarning, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../api/resources.js';
import { useApi, usePagination } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  Tabs,
  Textarea,
  formatDate,
  humanize,
} from '../../components/ui.jsx';
import { INCIDENT_SEVERITIES, INCIDENT_TYPES } from '../../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

/** Food-safety flags, disputes, and complaints. */
export function AdminIncidentsPage() {
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({ status: 'OPEN', type: '', severity: '' });
  const [detail, setDetail] = useState(null);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState('RESOLVED');
  const [releaseDonation, setReleaseDonation] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = useApi(
    () =>
      adminApi.incidents({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status || undefined,
        type: filters.type || undefined,
        severity: filters.severity || undefined,
      }),
    [pagination.page, pagination.limit, filters]
  );

  const all = useApi(() => adminApi.incidents({ limit: 50 }), []);

  async function resolve() {
    if (!detail) return;
    setBusy(true);
    try {
      await adminApi.resolveIncident(idOf(detail), {
        action,
        resolution: resolution.trim(),
        releaseDonation,
      });
      toast.success(`Incident marked ${action.toLowerCase().replace('_', ' ')}.`);
      setDetail(null);
      setResolution('');
      setReleaseDonation(false);
      list.reload();
      all.reload();
    } catch (error) {
      toast.error(error.message, { title: 'Could not record the resolution' });
    } finally {
      setBusy(false);
    }
  }

  const counts = (all.data?.items || []).reduce(
    (acc, incident) => {
      acc.total += 1;
      if (['OPEN', 'IN_REVIEW'].includes(incident.status)) acc.open += 1;
      if (['HIGH', 'CRITICAL'].includes(incident.severity)) acc.severe += 1;
      if (incident.type === 'FOOD_SAFETY') acc.safety += 1;
      return acc;
    },
    { total: 0, open: 0, severe: 0, safety: 0 }
  );

  const columns = [
    {
      key: 'incident',
      header: 'Incident',
      render: (row) => (
        <div>
          <strong>{row.title}</strong>
          <div className="tiny muted">
            {humanize(row.type)} · reported by {row.reporter?.name || 'unknown'}
          </div>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <StatusBadge status={row.severity} />,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'donation',
      header: 'Related record',
      render: (row) => (
        <div className="small">
          {row.donation ? (
            <Link to={`/donations/${idOf(row.donation)}`}>{row.donation.title}</Link>
          ) : (
            <span className="faint">—</span>
          )}
          <div className="tiny muted">
            {row.pickupTask ? (
              <Link to={`/pickups/${idOf(row.pickupTask)}`}>Open pickup task</Link>
            ) : (
              'No pickup linked'
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Reported',
      render: (row) => <span className="small muted">{formatDate(row.createdAt, { withTime: true })}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDetail(row);
              setResolution(row.resolution || '');
              setAction(row.status === 'OPEN' ? 'IN_REVIEW' : 'RESOLVED');
              setReleaseDonation(false);
            }}
          >
            Open
          </Button>
          {row.status !== 'RESOLVED' ? (
            <Button
              size="sm"
              variant="primary"
              icon={ShieldCheck}
              onClick={() => {
                setDetail(row);
                setResolution('');
                setAction('RESOLVED');
                setReleaseDonation(false);
              }}
            >
              Resolve
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Food-safety flags and incidents"
        subtitle="Everything partners have escalated: safety concerns, quantity and quality mismatches, missed pickups, and disputes."
      />

      <div className="grid grid-4">
        <StatCard label="Incidents recorded" value={counts.total} icon={AlertTriangle} />
        <StatCard
          label="Open or in review"
          value={counts.open}
          icon={FileWarning}
          tone={counts.open ? 'warning' : 'default'}
        />
        <StatCard
          label="High or critical"
          value={counts.severe}
          icon={AlertTriangle}
          tone={counts.severe ? 'warning' : 'default'}
        />
        <StatCard label="Food-safety type" value={counts.safety} icon={ShieldCheck} />
      </div>

      <Card className="mt-5">
        <CardHeader
          title={`${list.data?.pagination?.total ?? 0} incident${list.data?.pagination?.total === 1 ? '' : 's'}`}
          action={
            <div className="stack-sm" style={{ minWidth: 260 }}>
              <Tabs
                tabs={[
                  { value: 'OPEN', label: 'Open' },
                  { value: 'IN_REVIEW', label: 'In review' },
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: '', label: 'All' },
                ]}
                active={filters.status}
                onChange={(value) => {
                  setFilters((f) => ({ ...f, status: value }));
                  setPage(1);
                }}
              />
              <div className="row">
                <Select
                  label="Severity"
                  value={filters.severity}
                  onChange={(event) => {
                    setFilters((f) => ({ ...f, severity: event.target.value }));
                    setPage(1);
                  }}
                  options={[{ value: '', label: 'Any severity' }, ...INCIDENT_SEVERITIES.map((s) => ({ value: s, label: humanize(s) }))]}
                />
                <Select
                  label="Type"
                  value={filters.type}
                  onChange={(event) => {
                    setFilters((f) => ({ ...f, type: event.target.value }));
                    setPage(1);
                  }}
                  options={[{ value: '', label: 'Any type' }, ...INCIDENT_TYPES.map((t) => ({ value: t, label: humanize(t) }))]}
                />
              </div>
            </div>
          }
        />

        {list.error ? (
          <div className="card-body">
            <Alert variant="danger" title="Incidents could not be loaded">
              {list.error.message}
            </Alert>
          </div>
        ) : list.loading ? (
          <div className="card-body">
            <div className="skeleton skeleton-block" />
          </div>
        ) : list.data?.items?.length ? (
          <>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={columns} rows={list.data.items} caption="Incidents and disputes" />
            </div>
            {list.data.pagination ? (
              <div className="card-body">
                <Pagination
                  page={list.data.pagination.page}
                  totalPages={list.data.pagination.totalPages || 1}
                  total={list.data.pagination.total}
                  limit={pagination.limit}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="card-body">
            <EmptyState
              icon={ShieldCheck}
              title="No incidents in this view"
              description="Incidents are filed by donors, recipients, and delivery partners when something goes wrong. An empty queue here means nothing has been escalated."
            />
          </div>
        )}
      </Card>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Incident detail" size="lg">
        {detail ? (
          <div className="stack">
            <div className="spread">
              <strong>{detail.title}</strong>
              <div className="row">
                <StatusBadge status={detail.severity} />
                <StatusBadge status={detail.status} />
              </div>
            </div>

            <p className="small">{detail.description}</p>

            <dl className="detail-list">
              <div>
                <dt>Type</dt>
                <dd>{humanize(detail.type)}</dd>
              </div>
              <div>
                <dt>Reported by</dt>
                <dd>{detail.reporter?.name || '—'}</dd>
              </div>
              <div>
                <dt>Reported at</dt>
                <dd>{formatDate(detail.createdAt, { withTime: true })}</dd>
              </div>
              <div>
                <dt>Safety hold applied</dt>
                <dd>{detail.safetyHoldApplied ? <Badge variant="danger">Yes</Badge> : 'No'}</dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>{detail.assignedTo?.name || 'Unassigned'}</dd>
              </div>
              <div>
                <dt>Donation</dt>
                <dd>{detail.donation ? <Link to={`/donations/${idOf(detail.donation)}`}>{detail.donation.title}</Link> : '—'}</dd>
              </div>
            </dl>

            {detail.resolutionHistory?.length ? (
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)' }}>History</h3>
                <ul className="timeline mt-2">
                  {detail.resolutionHistory.map((entry, index) => (
                    <li className="timeline-item" key={index}>
                      <span className={`timeline-dot ${index === detail.resolutionHistory.length - 1 ? 'timeline-dot-current' : 'timeline-dot-done'}`} />
                      <div>
                        <div className="small strong">{humanize(entry.action)}</div>
                        <div className="tiny muted">
                          {formatDate(entry.at, { withTime: true })}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="stack">
              <h3 style={{ fontSize: 'var(--text-sm)' }}>Record a decision</h3>
              <Select
                label="Action"
                value={action}
                onChange={(event) => setAction(event.target.value)}
                options={[
                  { value: 'IN_REVIEW', label: 'Mark as in review' },
                  { value: 'RESOLVED', label: 'Resolve' },
                  { value: 'DISMISSED', label: 'Dismiss' },
                ]}
              />
              <Textarea
                label="Resolution note"
                rows={3}
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                hint="Required to resolve. This becomes part of the permanent record."
              />
              {detail.donation?.status === 'SAFETY_HOLD' ? (
                <label className="checkbox-row" htmlFor="release-hold">
                  <input
                    id="release-hold"
                    type="checkbox"
                    checked={releaseDonation}
                    onChange={(event) => setReleaseDonation(event.target.checked)}
                  />
                  <span>
                    <span className="strong small" style={{ display: 'block' }}>
                      Release the safety hold on this donation
                    </span>
                    <span className="tiny muted">
                      Only do this once you are satisfied the food is safe to redistribute again.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={resolve} loading={busy}>
                Record decision
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default AdminIncidentsPage;
