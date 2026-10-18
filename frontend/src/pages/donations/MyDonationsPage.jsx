import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Pencil, Plus, Rocket, XCircle } from 'lucide-react';
import { donationApi } from '../../api/resources.js';
import { useApi, usePagination } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Alert,
  AllocationMeter,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Textarea,
  formatDate,
  formatQuantity,
} from '../../components/ui.jsx';
import { DONATION_STATUSES, humanize } from '../../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

/** Everything a donor has published, with the actions valid for each status. */
export function MyDonationsPage() {
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 10 });
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useApi(
    () => donationApi.mine({ page: pagination.page, limit: pagination.limit, status: statusFilter || undefined }),
    [pagination.page, pagination.limit, statusFilter]
  );

  async function publish(donation) {
    setBusy(true);
    try {
      await donationApi.publish(idOf(donation));
      toast.success('Listing published. Eligible recipients can now find it.');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not publish' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      await donationApi.cancel(idOf(cancelTarget), cancelReason.trim());
      toast.success('Listing cancelled and any holds released.');
      setCancelTarget(null);
      setCancelReason('');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not cancel' });
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
            {humanize(row.foodCategory)} · {humanize(row.dietaryClassification)} · {formatQuantity(row.quantity, row.unit)}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'allocation',
      header: 'Allocation',
      render: (row) => (
        <div style={{ minWidth: 180 }}>
          <AllocationMeter
            quantity={row.quantity}
            available={row.availableQuantity}
            reserved={row.reservedQuantity}
            collected={row.collectedQuantity}
            label={`${row.remainingQuantity} left`}
          />
        </div>
      ),
    },
    {
      key: 'deadline',
      header: 'Collect by',
      render: (row) => (
        <span className={new Date(row.collectionDeadline) < new Date() ? 'strong' : ''}>
          {formatDate(row.collectionDeadline, { withTime: true })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const canEdit = ['DRAFT', 'AVAILABLE', 'PARTIALLY_RESERVED'].includes(row.status) && row.reservedQuantity === 0;
        const canPublish = row.status === 'DRAFT';
        const canCancel = !['CANCELLED', 'COMPLETED', 'COLLECTED', 'DELIVERED'].includes(row.status);
        return (
          <div className="table-actions">
            {canPublish ? (
              <Button size="sm" variant="primary" icon={Rocket} onClick={() => publish(row)} disabled={busy}>
                Publish
              </Button>
            ) : null}
            {canEdit ? (
              <LinkButton to={`/donations/${idOf(row)}/edit`} size="sm" variant="secondary" icon={Pencil}>
                Edit
              </LinkButton>
            ) : null}
            <LinkButton to={`/donations/${idOf(row)}`} size="sm" variant="ghost">
              Open
            </LinkButton>
            {canCancel ? (
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
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="My surplus listings"
        subtitle="Track each listing from draft through reservation, collection and confirmed delivery."
        actions={
          <LinkButton to="/donations/new" variant="primary" icon={Plus}>
            Publish surplus
          </LinkButton>
        }
      />

      {error ? (
        <Alert variant="danger" title="Listings could not be loaded">
          {error.message}
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title={`${data?.pagination?.total ?? 0} listing${data?.pagination?.total === 1 ? '' : 's'}`}
          action={
            <div style={{ minWidth: 200 }}>
              <Select
                label="Filter by status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                options={[{ value: '', label: 'All statuses' }, ...DONATION_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
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
              <DataTable columns={columns} rows={data.items} caption="Your surplus listings" />
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
              icon={Package}
              title={statusFilter ? 'No listings with this status' : 'You have not published surplus yet'}
              description={
                statusFilter
                  ? 'Try a different status filter to see your other listings.'
                  : 'Publish what is left over after service. Recipients within your service area are matched automatically.'
              }
              action={
                statusFilter ? (
                  <Button variant="secondary" onClick={() => setStatusFilter('')}>
                    Clear filter
                  </Button>
                ) : (
                  <LinkButton to="/donations/new" variant="primary" icon={Plus}>
                    Publish surplus
                  </LinkButton>
                )
              }
            />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel this listing?"
        confirmLabel="Cancel listing"
        loading={busy}
      >
        <div className="stack-sm">
          <p className="small">
            <strong>{cancelTarget?.title}</strong> will be withdrawn from the marketplace and any outstanding
            reservation holds will be released.
          </p>
          <Textarea
            label="Reason (required)"
            rows={2}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            hint="Recorded in the audit trail and shared with affected recipients."
          />
          {cancelReason.trim().length < 3 ? (
            <span className="field-error">Please give a reason of at least three characters.</span>
          ) : null}
          {['COLLECTED', 'DELIVERED'].includes(cancelTarget?.status) ? (
            <Alert variant="warning" title="Food is already in custody">
              This listing has been collected. Cancelling is not possible — report an incident instead so the
              shortfall is recorded.
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default MyDonationsPage;
