import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Truck } from 'lucide-react';
import { adminApi, analyticsApi } from '../../api/resources.js';
import { useApi, usePagination } from '../../hooks/useApi.js';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  formatDate,
  formatQuantity,
  humanize,
} from '../../components/ui.jsx';
import { PICKUP_STATUSES } from '../../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

/** Pickup monitoring: are collections actually happening on time? */
export function AdminPickupsPage() {
  const { pagination, setPage } = usePagination({ page: 1, limit: 20 });
  const [status, setStatus] = useState('');

  const { data, error, loading, reload } = useApi(
    () => adminApi.pickups({ page: pagination.page, limit: pagination.limit, status: status || undefined }),
    [pagination.page, pagination.limit, status]
  );
  const analytics = useApi(() => analyticsApi.pickups(), []);

  const columns = [
    {
      key: 'task',
      header: 'Task',
      render: (row) => (
        <div>
          <Link to={`/pickups/${idOf(row)}`} className="strong">
            {row.donation?.title || 'Pickup task'}
          </Link>
          <div className="tiny muted">
            {row.donor?.name || 'Donor'} → {row.recipient?.name || 'Recipient'}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'assignment',
      header: 'Assigned',
      render: (row) => (
        <div className="small">
          {row.assignedTo?.name || 'Unassigned'}
          <div className="tiny muted">{humanize(row.assignmentType)}</div>
        </div>
      ),
    },
    {
      key: 'window',
      header: 'Window',
      render: (row) => (
        <span className="small">
          <Clock size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
          {formatDate(row.windowStart, { withTime: true })}
        </span>
      ),
    },
    {
      key: 'quantities',
      header: 'Quantities',
      render: (row) => (
        <div className="small">
          expected {formatQuantity(row.expectedQuantity, row.unit)}
          <div className="tiny muted">
            collected {row.collectedQuantity ?? 0} · delivered {row.deliveredQuantity ?? 0}
          </div>
        </div>
      ),
    },
    {
      key: 'delay',
      header: 'Delay',
      render: (row) =>
        row.delayMinutes ? (
          <Badge variant={row.delayMinutes > 30 ? 'danger' : 'warning'}>{row.delayMinutes} min</Badge>
        ) : (
          <span className="faint">on time</span>
        ),
    },
    {
      key: 'failed',
      header: 'Failure',
      render: (row) =>
        row.failure?.reason ? <span className="small">{row.failure.reason}</span> : <span className="faint">—</span>,
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Pickup monitoring"
        subtitle="Collections across the platform, with delay and failure indicators so problem routes surface early."
        actions={
          <LinkButton to="/admin/incidents" variant="secondary">
            Incidents
          </LinkButton>
        }
      />

      <div className="grid grid-4">
        <StatCard label="Pickups attempted" value={analytics.data?.attemptedPickups ?? 0} icon={Truck} />
        <StatCard
          label="Successful rate"
          value={
            analytics.data?.successfulPickupRate === null || analytics.data?.successfulPickupRate === undefined
              ? '—'
              : `${analytics.data.successfulPickupRate}%`
          }
          hint="Completed without failure"
          icon={Truck}
        />
        <StatCard
          label="Failed pickups"
          value={analytics.data?.failedPickups ?? 0}
          icon={Truck}
          tone={analytics.data?.failedPickups ? 'warning' : 'default'}
        />
        <StatCard
          label="Average delay"
          value={`${analytics.data?.averageDelayMinutes ?? 0} min`}
          hint={`Longest ${analytics.data?.maxDelayMinutes ?? 0} min · ${analytics.data?.latePickups ?? 0} late`}
          icon={Clock}
        />
      </div>

      {error ? (
        <div className="mt-4">
          <Alert variant="danger" title="Pickups could not be loaded">
            {error.message}
          </Alert>
        </div>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title={`${data?.pagination?.total ?? 0} pickup task${data?.pagination?.total === 1 ? '' : 's'}`}
          action={
            <Select
              label="Status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              options={[{ value: '', label: 'All statuses' }, ...PICKUP_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
            />
          }
        />

        {loading ? (
          <div className="card-body">
            <div className="skeleton skeleton-block" />
          </div>
        ) : data?.items?.length ? (
          <>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={columns} rows={data.items} caption="Pickup tasks" />
            </div>
            {data.pagination ? (
              <div className="card-body">
                <Pagination
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages || 1}
                  total={data.pagination.total}
                  limit={pagination.limit}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="card-body">
            <EmptyState
              icon={Truck}
              title="No pickup tasks match"
              description="Pickups appear once a reservation is accepted and a collection is arranged."
            />
          </div>
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Where collections are failing" subtitle="Failed or delayed tasks, most delayed first." />
        <div className="card-body">
          {loading ? (
            <LoadingBlock label="Loading…" />
          ) : (
            <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
              {(data?.items || [])
                .filter((task) => task.status === 'FAILED' || task.delayMinutes)
                .sort((a, b) => (b.delayMinutes || 0) - (a.delayMinutes || 0))
                .slice(0, 6)
                .map((task) => (
                  <li key={idOf(task)} className="spread">
                    <div>
                      <Link to={`/pickups/${idOf(task)}`} className="small strong">
                        {task.donation?.title || 'Pickup task'}
                      </Link>
                      <div className="tiny muted">
                        <MapPin size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                        {task.pickupAddress}
                      </div>
                    </div>
                    <div className="row">
                      {task.delayMinutes ? <Badge variant="warning">{task.delayMinutes} min late</Badge> : null}
                      <StatusBadge status={task.status} />
                    </div>
                  </li>
                ))}
              {!(data?.items || []).some((task) => task.status === 'FAILED' || task.delayMinutes) ? (
                <li className="small muted">No failures or delays on this page.</li>
              ) : null}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

export default AdminPickupsPage;
