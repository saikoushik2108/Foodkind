import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Truck } from 'lucide-react';
import { pickupApi } from '../../api/resources.js';
import { useApi, usePagination } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Tabs,
  formatDate,
  formatQuantity,
  formatRelative,
  humanize,
} from '../../components/ui.jsx';
import { PICKUP_STATUSES } from '../../constants/domain.js';

const idOf = (record) => {
  if (!record) return null;
  if (typeof record === 'string') return record;
  return record.id || record._id || null;
};

/** Everything waiting to be collected or delivered. */
export function PickupsPage() {
  const { user, isAdmin, isVolunteer, isAgent, isPartner } = useAuth();
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 10 });
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);

  const { data, error, loading, reload } = useApi(
    () => pickupApi.mine({ page: pagination.page, limit: pagination.limit, status: status || undefined }),
    [pagination.page, pagination.limit, status],
    { pollInterval: 6000 }
  );

  async function handleAccept(taskId) {
    setBusyId(taskId);
    try {
      await pickupApi.accept(taskId);
      toast.success('Pickup accepted! You are now the assigned collector.');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not accept pickup' });
    } finally {
      setBusyId(null);
    }
  }

  const active = (data?.items || []).filter((task) => ['ASSIGNED', 'ARRIVED', 'COLLECTED'].includes(task.status));
  const finished = (data?.items || []).filter((task) => !['ASSIGNED', 'ARRIVED', 'COLLECTED'].includes(task.status));

  return (
    <div className="page">
      <PageHeader
        title="Pickups"
        subtitle="Collections you are responsible for, and collections heading your way. Verify the handover code before the food leaves the premises."
        actions={
          <LinkButton to="/reservations" variant="secondary">
            Reservations
          </LinkButton>
        }
      />

      {error ? (
        <Alert variant="danger" title="Pickups could not be loaded">
          {error.message}
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title={`${data?.pagination?.total ?? 0} pickup task${data?.pagination?.total === 1 ? '' : 's'}`}
          subtitle={active.length ? `${active.length} still in progress on this page.` : 'Nothing in progress on this page.'}
          action={
            <div className="stack-sm" style={{ minWidth: 220 }}>
              <Tabs
                tabs={[
                  { value: '', label: 'All' },
                  { value: 'ASSIGNED', label: 'Assigned' },
                  { value: 'ARRIVED', label: 'Arrived' },
                  { value: 'COLLECTED', label: 'Collected' },
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
                options={[{ value: '', label: 'All statuses' }, ...PICKUP_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
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
            <div className="card-body stack">
              {[...active, ...finished].map((task) => (
                <Card key={idOf(task)} style={{ boxShadow: 'none' }}>
                  <div className="card-body stack-sm">
                    <div className="spread">
                      <div>
                        <Link to={`/pickups/${idOf(task)}`} className="strong">
                          {task.donation?.title || 'Pickup task'}
                        </Link>
                        <div className="tiny muted">
                          {task.pickupAddress} → {task.deliveryAddress}
                        </div>
                      </div>
                      <div className="row">
                        <StatusBadge status={task.status} />
                        <Badge variant="neutral">{humanize(task.assignmentType)}</Badge>
                      </div>
                    </div>

                    <div className="row-wrap tiny muted">
                      <span>
                        <Clock size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                        {formatDate(task.windowStart, { withTime: true })} → {formatDate(task.windowEnd, { withTime: true })}
                      </span>
                      <span>
                        <MapPin size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                        {task.pickupAddress}
                      </span>
                      <span>
                        Expected {formatQuantity(task.expectedQuantity, task.unit)}
                        {task.collectedQuantity ? ` · collected ${formatQuantity(task.collectedQuantity, task.unit)}` : ''}
                        {task.deliveredQuantity ? ` · delivered ${formatQuantity(task.deliveredQuantity, task.unit)}` : ''}
                      </span>
                      <span>Updated {formatRelative(task.updatedAt)}</span>
                    </div>

                    <div className="table-actions">
                      {((task.isAvailableToAccept || !task.assignedTo || task.status === 'PENDING_ACCEPTANCE') && (isVolunteer || isAgent || isPartner || isAdmin)) ? (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={CheckCircle2}
                          loading={busyId === idOf(task)}
                          onClick={() => handleAccept(idOf(task))}
                        >
                          Accept pickup
                        </Button>
                      ) : null}
                      <LinkButton to={`/pickups/${idOf(task)}`} size="sm" variant="secondary" icon={Truck}>
                        Open task
                      </LinkButton>
                      {task.donation ? (
                        <LinkButton to={`/donations/${idOf(task.donation)}`} size="sm" variant="ghost">
                          Open listing
                        </LinkButton>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
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
              icon={Truck}
              title="No pickup tasks"
              description="Pickups appear here once a reservation is accepted and a collection is arranged — either by the donor, the recipient, or a partner organization."
              action={
                <LinkButton to="/reservations" variant="primary">
                  Go to reservations
                </LinkButton>
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default PickupsPage;
