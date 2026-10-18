import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Package, ShieldAlert, XCircle } from 'lucide-react';
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
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Textarea,
  formatDate,
  formatQuantity,
  humanize,
} from '../../components/ui.jsx';
import { DONATION_STATUSES } from '../../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

/** Donation monitoring: see everything, trace the chain, force-cancel safely. */
export function AdminDonationsPage() {
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [applied, setApplied] = useState({ q: '', status: '' });
  const [busy, setBusy] = useState(false);
  const [traceFor, setTraceFor] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [releaseDonation, setReleaseDonation] = useState(true);

  const { data, error, loading, reload } = useApi(
    () =>
      adminApi.donations({
        page: pagination.page,
        limit: pagination.limit,
        q: applied.q || undefined,
        status: applied.status || undefined,
      }),
    [pagination.page, pagination.limit, applied]
  );

  const trace = useApi(
    () => (traceFor ? adminApi.traceDonation(idOf(traceFor)) : Promise.resolve(null)),
    [traceFor]
  );

  async function forceCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      await adminApi.cancelDonation(idOf(cancelTarget), cancelReason.trim(), releaseDonation);
      toast.success('Donation cancelled and recorded in the audit log.');
      setCancelTarget(null);
      setCancelReason('');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not cancel the donation' });
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'title',
      header: 'Listing',
      render: (row) => (
        <div>
          <Link to={`/donations/${idOf(row)}`} className="strong">
            {row.title}
          </Link>
          <div className="tiny muted">
            {row.donor?.name || 'Unknown donor'} · {humanize(row.foodCategory)}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'allocation',
      header: 'Allocation',
      render: (row) => (
        <div className="small">
          {formatQuantity(row.availableQuantity, row.unit)} available
          <div className="tiny muted">
            {formatQuantity(row.reservedQuantity, row.unit)} reserved · {formatQuantity(row.collectedQuantity, row.unit)} collected
          </div>
        </div>
      ),
    },
    {
      key: 'delivered',
      header: 'Delivered',
      render: (row) => <span className="strong">{formatQuantity(row.deliveredQuantity, row.unit)}</span>,
    },
    {
      key: 'deadline',
      header: 'Deadline',
      render: (row) => <span className="small muted">{formatDate(row.collectionDeadline, { withTime: true })}</span>,
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (row) => (
        <div className="row-wrap">
          {row.status === 'SAFETY_HOLD' ? <Badge variant="danger">Safety hold</Badge> : null}
          {row.status === 'DISPUTED' ? <Badge variant="danger">Disputed</Badge> : null}
          {row.cancellation?.reason ? <Badge variant="neutral">Cancelled</Badge> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions">
          <Button size="sm" variant="ghost" icon={Eye} onClick={() => setTraceFor(row)}>
            Trace
          </Button>
          {!['CANCELLED', 'COMPLETED'].includes(row.status) ? (
            <Button
              size="sm"
              variant="outline-danger"
              icon={XCircle}
              onClick={() => {
                setCancelTarget(row);
                setCancelReason('');
                setReleaseDonation(true);
              }}
            >
              Force cancel
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Donation monitoring"
        subtitle="Every listing on the platform, including drafts. Food already in custody must be routed to an incident rather than quietly cancelled."
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
              label="Search titles"
              value={filters.q}
              onChange={(event) => setFilters((f) => ({ ...f, q: event.target.value }))}
              placeholder="e.g. biryani, surplus, buffet"
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
              options={[{ value: '', label: 'All statuses' }, ...DONATION_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
            />
            <div className="field">
              <span className="field-label">Apply</span>
              <div className="row">
                <Button type="submit" variant="primary">
                  Filter
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const cleared = { q: '', status: '' };
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
          <Alert variant="danger" title="Donations could not be loaded">
            {error.message}
          </Alert>
        </div>
      ) : null}

      <Card className="mt-5">
        <CardHeader title={`${data?.pagination?.total ?? 0} donation${data?.pagination?.total === 1 ? '' : 's'}`} />
        {loading ? (
          <div className="card-body">
            <div className="skeleton skeleton-block" />
          </div>
        ) : data?.items?.length ? (
          <>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={columns} rows={data.items} caption="All donations" />
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
            <EmptyState icon={Package} title="No donations match" description="Adjust the filters to see other listings." />
          </div>
        )}
      </Card>

      <Modal open={Boolean(traceFor)} onClose={() => setTraceFor(null)} title="Donation audit trace" size="lg">
        {trace.loading ? (
          <LoadingBlock label="Reconstructing the audit chain…" />
        ) : trace.error ? (
          <Alert variant="danger" title="Trace unavailable">
            {trace.error.message}
          </Alert>
        ) : trace.data ? (
          <div className="stack">
            <div>
              <h3 style={{ fontSize: 'var(--text-sm)' }}>Donation</h3>
              <dl className="detail-list mt-2">
                <div>
                  <dt>Title</dt>
                  <dd>{trace.data.donation?.title}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={trace.data.donation?.status} />
                  </dd>
                </div>
                <div>
                  <dt>Quantity</dt>
                  <dd>{formatQuantity(trace.data.donation?.quantity, trace.data.donation?.unit)}</dd>
                </div>
                <div>
                  <dt>Delivered</dt>
                  <dd>{formatQuantity(trace.data.donation?.deliveredQuantity, trace.data.donation?.unit)}</dd>
                </div>
              </dl>
              <p className="small mt-2">
                <Link to={`/donations/${idOf(traceFor)}`}>Open the full listing page</Link>
              </p>
            </div>

            {trace.data.reservations?.length ? (
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)' }}>Reservations</h3>
                <ul className="stack-sm mt-2" style={{ listStyle: 'none', padding: 0 }}>
                  {trace.data.reservations.map((reservation, index) => (
                    <li key={index} className="card card-pad" style={{ boxShadow: 'none' }}>
                      <div className="spread">
                        <span className="small strong">{reservation.recipient?.name || 'Recipient'}</span>
                        <StatusBadge status={reservation.status} />
                      </div>
                      <div className="tiny muted mt-2">
                        {formatQuantity(reservation.approvedQuantity || reservation.requestedQuantity, reservation.unit)} ·{' '}
                        {formatDate(reservation.createdAt, { withTime: true })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {trace.data.pickups?.length ? (
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)' }}>Pickup tasks</h3>
                <ul className="stack-sm mt-2" style={{ listStyle: 'none', padding: 0 }}>
                  {trace.data.pickups.map((task, index) => (
                    <li key={index} className="stack-sm">
                      <div className="spread">
                        <span className="small strong">Task {index + 1}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      <span className="tiny muted">
                        {formatQuantity(task.collectedQuantity || 0, task.unit)} collected ·{' '}
                        {formatQuantity(task.deliveredQuantity || 0, task.unit)} delivered
                      </span>
                      <Link className="small" to={`/pickups/${idOf(task)}`}>
                        Open pickup
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {trace.data.incidents?.length ? (
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)' }}>Incidents</h3>
                <ul className="stack-sm mt-2" style={{ listStyle: 'none', padding: 0 }}>
                  {trace.data.incidents.map((incident, index) => (
                    <li key={index} className="spread">
                      <span className="small">{incident.title}</span>
                      <StatusBadge status={incident.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="small muted">
                <ShieldAlert size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> No incidents
                recorded against this donation.
              </p>
            )}

            {trace.data.auditLogs?.length ? (
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)' }}>Audit events</h3>
                <ul className="timeline mt-2">
                  {trace.data.auditLogs.slice(0, 20).map((entry, index) => (
                    <li className="timeline-item" key={index}>
                      <span className={`timeline-dot ${index === 0 ? 'timeline-dot-current' : 'timeline-dot-done'}`} />
                      <div>
                        <div className="small strong">{humanize(entry.action)}</div>
                        <div className="tiny muted">
                          {formatDate(entry.createdAt, { withTime: true })} · {entry.actor?.name || 'system'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setTraceFor(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
        onConfirm={forceCancel}
        title="Force-cancel this donation?"
        confirmLabel="Cancel donation"
        loading={busy}
      >
        <div className="stack-sm">
          <p className="small">
            <strong>{cancelTarget?.title}</strong> will be cancelled as an administrator action. The reason is recorded and
            visible to the donor.
          </p>
          <Textarea
            label="Reason (required)"
            rows={2}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          <label className="checkbox-row" htmlFor="release-donation">
            <input
              id="release-donation"
              type="checkbox"
              checked={releaseDonation}
              onChange={(event) => setReleaseDonation(event.target.checked)}
            />
            <span>
              <span className="strong small" style={{ display: 'block' }}>
                Release outstanding reservation holds
              </span>
              <span className="tiny muted">
                Leave this on unless the food is already in someone&apos;s custody.
              </span>
            </span>
          </label>
          {cancelReason.trim().length < 3 ? (
            <span className="field-error">Please give a reason of at least three characters.</span>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default AdminDonationsPage;
