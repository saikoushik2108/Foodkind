import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, ClipboardList, Truck, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { reservationApi } from '../api/resources.js';
import { useApi, usePagination } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LinkButton,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  formatDate,
  formatQuantity,
  formatRelative,
} from '../components/ui.jsx';
import { PICKUP_ASSIGNMENT_TYPES, RESERVATION_STATUSES, humanize } from '../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

/** Reservation queue: the donor accepts or declines, the recipient tracks. */
export function ReservationsPage() {
  const { isDonor, isAdmin, isRecipient } = useAuth();
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 10 });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pickupFor, setPickupFor] = useState(null);
  const [pickupForm, setPickupForm] = useState({ assignmentType: 'RECIPIENT_SELF_PICKUP', assignedTo: '' });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [detail, setDetail] = useState(null);

  const { data, error, loading, reload } = useApi(
    () => reservationApi.mine({ page: pagination.page, limit: pagination.limit, status: status || undefined }),
    [pagination.page, pagination.limit, status],
    { pollInterval: 6000 }
  );

  async function act(fn, successMessage, failureTitle) {
    setBusy(true);
    try {
      await fn();
      toast.success(successMessage);
      reload();
      return true;
    } catch (err) {
      toast.error(err.message, { title: failureTitle });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'donation',
      header: 'Listing',
      render: (row) => (
        <div>
          <span className="strong">{row.donation?.title || 'Listing'}</span>
          <div className="tiny muted">
            {row.donation?.collectionAddress || ''}
            {row.donation?.unit ? ` · ${humanize(row.donation.unit)}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (row) => (
        <span>
          {formatQuantity(row.approvedQuantity ?? row.requestedQuantity, row.unit || row.donation?.unit)}
          {row.deliveredQuantity ? (
            <span className="tiny muted" style={{ display: 'block' }}>
              delivered {formatQuantity(row.deliveredQuantity, row.unit || row.donation?.unit)}
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'created',
      header: 'Requested',
      render: (row) => <span className="small muted">{formatRelative(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const isPending = row.status === 'RESERVED';
        const isActive = ['RESERVED', 'ACCEPTED'].includes(row.status);
        const canArrangePickup = ['RESERVED', 'ACCEPTED'].includes(row.status) && (isDonor || isAdmin || isRecipient);
        return (
          <div className="table-actions">
            <Button size="sm" variant="ghost" onClick={() => setDetail(row)}>
              Details
            </Button>
            {isDonor || isAdmin ? (
              <>
                {isPending ? (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCheck}
                    loading={busy}
                    onClick={() => act(() => reservationApi.accept(idOf(row)), 'Reservation accepted.', 'Could not accept')}
                  >
                    Accept
                  </Button>
                ) : null}
                {isActive ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      act(
                        () => reservationApi.decline(idOf(row), 'Declined by the donor'),
                        'Reservation declined; the quantity is available again.',
                        'Could not decline'
                      )
                    }
                    loading={busy}
                  >
                    Decline
                  </Button>
                ) : null}
              </>
            ) : null}
            {canArrangePickup ? (
              <Button
                size="sm"
                variant="secondary"
                icon={Truck}
                onClick={() => {
                  setPickupFor(row);
                  setPickupForm({
                    assignmentType: isRecipient && !isDonor ? 'RECIPIENT_SELF_PICKUP' : 'PARTNER',
                    assignedTo: '',
                  });
                }}
              >
                Pickup
              </Button>
            ) : null}
            {isRecipient || isDonor || isAdmin ? (
              isActive ? (
                <Button
                  size="sm"
                  variant="outline-danger"
                  icon={XCircle}
                  onClick={() => {
                    setCancelTarget(row);
                    setCancelReason('');
                  }}
                >
                  Cancel
                </Button>
              ) : null
            ) : null}
          </div>
        );
      },
    },
  ];

  async function createPickup() {
    if (!pickupFor) return;
    const ok = await act(
      () =>
        reservationApi.createPickup(idOf(pickupFor), {
          assignmentType: pickupForm.assignmentType,
          assignedTo: pickupForm.assignedTo || null,
        }),
      'Pickup task created.',
      'Could not create the pickup'
    );
    if (ok) setPickupFor(null);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    const ok = await act(
      () => reservationApi.cancel(idOf(cancelTarget), cancelReason.trim()),
      'Reservation cancelled and the quantity released.',
      'Could not cancel the reservation'
    );
    if (ok) {
      setCancelTarget(null);
      setCancelReason('');
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={isRecipient && !isDonor ? 'Our reservations' : 'Reservations'}
        subtitle={
          isRecipient && !isDonor
            ? 'Track what you have requested, what was accepted, and what is ready to collect.'
            : 'Accept a reservation to commit food, or decline it to release the quantity immediately.'
        }
        actions={
          isRecipient ? (
            <LinkButton to="/marketplace" variant="primary">
              Find more food
            </LinkButton>
          ) : (
            <LinkButton to="/donations/mine" variant="secondary">
              My listings
            </LinkButton>
          )
        }
      />

      {error ? (
        <Alert variant="danger" title="Reservations could not be loaded">
          {error.message}
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title={`${data?.pagination?.total ?? 0} reservation${data?.pagination?.total === 1 ? '' : 's'}`}
          action={
            <div className="stack-sm" style={{ minWidth: 220 }}>
              <Tabs
                tabs={[
                  { value: '', label: 'All' },
                  { value: 'RESERVED', label: 'Awaiting decision' },
                  { value: 'ACCEPTED', label: 'Accepted' },
                  { value: 'COMPLETED', label: 'Completed' },
                ]}
                active={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />
              <Select
                label="Or pick any status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                options={[{ value: '', label: 'All statuses' }, ...RESERVATION_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
              />
            </div>
          }
        />

        {loading ? (
          <div className="card-body">
            <div className="skeleton skeleton-block" />
          </div>
        ) : data?.items?.length ? (
          <>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={columns} rows={data.items} caption="Reservations" />
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
              icon={ClipboardList}
              title="No reservations to show"
              description={
                isRecipient
                  ? 'Reserve food from the marketplace and it will appear here with its collection status.'
                  : 'When a recipient requests part of one of your listings, it will appear here for you to accept or decline.'
              }
              action={
                isRecipient ? (
                  <LinkButton to="/marketplace" variant="primary">
                    Browse the marketplace
                  </LinkButton>
                ) : (
                  <LinkButton to="/donations/new" variant="primary">
                    Publish surplus
                  </LinkButton>
                )
              }
            />
          </div>
        )}
      </Card>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Reservation detail" size="lg">
        {detail ? (
          <div className="stack">
            <div className="spread">
              <strong>{detail.donation?.title || 'Listing'}</strong>
              <StatusBadge status={detail.status} />
            </div>
            <dl className="detail-list">
              <div>
                <dt>Requested</dt>
                <dd>{formatQuantity(detail.requestedQuantity, detail.unit || detail.donation?.unit)}</dd>
              </div>
              <div>
                <dt>Approved</dt>
                <dd>{detail.approvedQuantity ? formatQuantity(detail.approvedQuantity, detail.unit || detail.donation?.unit) : '—'}</dd>
              </div>
              <div>
                <dt>Delivered</dt>
                <dd>{detail.deliveredQuantity ? formatQuantity(detail.deliveredQuantity, detail.unit || detail.donation?.unit) : '—'}</dd>
              </div>
              <div>
                <dt>Requested at</dt>
                <dd>{formatDate(detail.createdAt, { withTime: true })}</dd>
              </div>
              <div>
                <dt>Released at</dt>
                <dd>{detail.releasedAt ? formatDate(detail.releasedAt, { withTime: true }) : '—'}</dd>
              </div>
              <div>
                <dt>Decline reason</dt>
                <dd>{detail.declineReason || '—'}</dd>
              </div>
            </dl>

            {detail.message ? (
              <Alert variant="info" title="Message from the requester">
                {detail.message}
              </Alert>
            ) : null}

            {detail.decisionHistory?.length ? (
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)' }}>Decision history</h3>
                <ul className="timeline mt-3">
                  {detail.decisionHistory.map((entry, index) => (
                    <li className="timeline-item" key={index}>
                      <span className={`timeline-dot ${index === detail.decisionHistory.length - 1 ? 'timeline-dot-current' : 'timeline-dot-done'}`} />
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

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              {detail.donation ? (
                <LinkButton to={`/donations/${idOf(detail.donation)}`} variant="secondary" size="sm">
                  Open listing
                </LinkButton>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(pickupFor)}
        onClose={() => setPickupFor(null)}
        title="Arrange a pickup"
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setPickupFor(null)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Truck} onClick={createPickup} loading={busy}>
              Create pickup
            </Button>
          </div>
        }
      >
        <div className="stack">
          <Select
            label="Assignment type"
            value={pickupForm.assignmentType}
            onChange={(event) => setPickupForm((f) => ({ ...f, assignmentType: event.target.value }))}
            options={PICKUP_ASSIGNMENT_TYPES.map((type) => ({ value: type, label: humanize(type) }))}
          />
          {pickupForm.assignmentType !== 'RECIPIENT_SELF_PICKUP' ? (
            <div className="field">
              <label className="field-label" htmlFor="reservation-assignee">
                Assign to user id (optional)
              </label>
              <input
                id="reservation-assignee"
                className="input"
                value={pickupForm.assignedTo}
                onChange={(event) => setPickupForm((f) => ({ ...f, assignedTo: event.target.value }))}
                placeholder="Leave blank to assign later"
              />
              <span className="field-hint">The assigned person sees this task in their pickup queue.</span>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel this reservation?"
        confirmLabel="Cancel reservation"
        loading={busy}
      >
        <div className="stack-sm">
          <p className="small">
            The quantity returns to the listing immediately and can be claimed by another organization.
          </p>
          <Textarea
            label="Reason (required)"
            rows={2}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          {cancelReason.trim().length < 3 ? (
            <span className="field-error">Please give a reason of at least three characters.</span>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default ReservationsPage;
