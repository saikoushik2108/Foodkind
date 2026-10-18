import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Package,
  Search,
  Sparkles,
  Truck,
  Utensils,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi, donationApi, pickupApi, reservationApi } from '../api/resources.js';
import { useApi } from '../hooks/useApi.js';
import {
  Alert,
  AllocationMeter,
  Button,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  StatCard,
  StatusBadge,
  formatDate,
  formatQuantity,
  formatRelative,
  LoadingBlock,
} from '../components/ui.jsx';
import { ComparisonBarChart, SurplusAreaChart } from '../components/Charts.jsx';

const idOf = (record) => record?.id || record?._id;

/** Landing page for every signed-in user, assembled per role. */
export function DashboardPage() {
  const { user, organization, isAdmin, isDonor, isRecipient, isPartner, isVerified } = useAuth();

  const overview = useApi(() => analyticsApi.overview(), []);
  const myDonations = useApi(() => (isDonor ? donationApi.mine({ limit: 5, sort: 'newest' }) : Promise.resolve(null)), [isDonor]);
  const myReservations = useApi(() => reservationApi.mine({ limit: 5 }), []);
  const myPickups = useApi(() => pickupApi.mine({ limit: 5 }), []);
  const openDemand = useApi(
    () => (isRecipient ? donationApi.list({ limit: 4, sort: 'deadline' }) : Promise.resolve(null)),
    [isRecipient]
  );

  const totals = overview.data?.impact?.totals;
  const pickups = overview.data?.pickups;
  const reservations = overview.data?.reservations;
  const trend = (overview.data?.donations?.statusTrend || []).slice(-14);
  const statusDistribution = (overview.data?.impact?.statusDistribution || []).map((row) => ({
    label: row.status
      ? row.status.toLowerCase().replace(/_/g, ' ')
      : 'unknown',
    value: row.count,
  }));

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="page">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={
          organization
            ? `${organization.name} · ${organization.city}`
            : 'Foodkind surplus redistribution'
        }
        actions={
          <>
            {isDonor ? (
              <LinkButton to="/donations/new" variant="primary" icon={Package}>
                Publish surplus
              </LinkButton>
            ) : null}
            {isRecipient ? (
              <LinkButton to="/marketplace" variant="primary" icon={Search}>
                Find food
              </LinkButton>
            ) : null}
            <LinkButton to="/impact" variant="secondary" icon={BarChart3}>
              Impact
            </LinkButton>
          </>
        }
      />

      {organization && !isVerified ? (
        <div className="mt-2" style={{ marginBottom: 'var(--space-5)' }}>
          <Alert
            variant={organization.verificationStatus === 'REJECTED' ? 'danger' : 'warning'}
            title={
              organization.verificationStatus === 'PENDING'
                ? 'Your organization is awaiting verification'
                : organization.verificationStatus === 'REJECTED'
                  ? 'Your organization was not approved'
                  : `Your organization is ${organization.verificationStatus.toLowerCase()}`
            }
            action={
              <LinkButton to="/organization" variant="secondary" size="sm">
                View status
              </LinkButton>
            }
          >
            {organization.verificationStatus === 'PENDING'
              ? 'You can complete your profile and upload documents now. Publishing surplus and claiming food unlock once an administrator approves your organization. (Testing tip: sign in as admin@foodkind.local / DevAdmin!123 to approve any pending organization in 1 click).'
              : 'Check your organization page for the reviewer’s notes before resubmitting.'}
          </Alert>
        </div>
      ) : null}

      {overview.error ? (
        <Alert variant="danger" title="Dashboard statistics could not be loaded">
          {overview.error.message}
        </Alert>
      ) : null}

      <div className="grid grid-4">
        {overview.loading && !totals ? (
          <>
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
          </>
        ) : (
          <>
            <StatCard
              label="Portions redistributed"
              value={(totals?.portionsRedistributed ?? 0).toLocaleString()}
              hint="Confirmed deliveries only"
              icon={Utensils}
            />
            <StatCard
              label="Kilograms redistributed"
              value={(totals?.kilogramsRedistributed ?? 0).toLocaleString()}
              hint="Confirmed deliveries only"
              icon={Package}
            />
            <StatCard
              label={isDonor ? 'Listings published' : 'Reservations made'}
              value={
                isDonor
                  ? (totals?.donationsPublished ?? 0).toLocaleString()
                  : (reservations?.statusDistribution || []).reduce((sum, r) => sum + r.count, 0).toLocaleString()
              }
              hint={isDonor ? 'All statuses' : 'All statuses'}
              icon={ClipboardList}
            />
            <StatCard
              label="Completion rate"
              value={totals?.completionRate === null || totals?.completionRate === undefined ? '—' : `${totals.completionRate}%`}
              hint={isDonor ? 'Completed ÷ published' : `${pickups?.successfulPickupRate ?? '—'}% pickups successful`}
              icon={BarChart3}
            />
          </>
        )}
      </div>

      <p className="tiny muted mt-3">{totals?.note}</p>

      <div className="grid grid-sidebar mt-6">
        <div className="stack">
          <Card>
            <CardHeader
              title="Redistribution activity"
              subtitle="Published listings per day over the recent period."
              action={
                <Link to="/impact" className="small">
                  Full analytics
                </Link>
              }
            />
            <div className="card-body">
              <SurplusAreaChart
                title=""
                data={trend.map((point) => ({ label: point.date.slice(5), published: point.published }))}
                series={[{ key: 'published', name: 'Listings published' }]}
                height={230}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Donation pipeline"
              subtitle="Where your listings currently sit in the redistribution lifecycle."
            />
            <div className="card-body">
              {statusDistribution.length ? (
                <ComparisonBarChart
                  layout="vertical"
                  data={statusDistribution}
                  series={[{ key: 'value', name: 'Listings' }]}
                  height={Math.max(180, statusDistribution.length * 34)}
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title="No listings yet"
                  description={
                    isDonor
                      ? 'Publish your first surplus listing to see it move through the pipeline.'
                      : 'Nothing to show in this pipeline yet.'
                  }
                  action={isDonor ? <LinkButton to="/donations/new">Publish surplus</LinkButton> : null}
                />
              )}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHeader
              title={isRecipient ? 'Our open reservations' : 'Reservations needing attention'}
              action={
                <Link to="/reservations" className="small">
                  View all
                </Link>
              }
            />
            <div className="card-body stack-sm">
              {myReservations.loading ? (
                <LoadingBlock label="Loading reservations…" />
              ) : myReservations.data?.items?.length ? (
                myReservations.data.items.slice(0, 4).map((reservation) => (
                  <div key={idOf(reservation)} className="stack-sm" style={{ paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
                    <div className="spread">
                      <Link to={`/reservations`} className="small strong">
                        {reservation.donation?.title || 'Reservation'}
                      </Link>
                      <StatusBadge status={reservation.status} />
                    </div>
                    <span className="tiny muted">
                      {formatQuantity(reservation.approvedQuantity ?? reservation.requestedQuantity, reservation.unit || reservation.donation?.unit)}
                      {' · '}
                      {formatRelative(reservation.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="small muted">No reservations yet.</p>
              )}
            </div>
          </Card>

          {isPartner || pickups?.attemptedPickups ? (
            <Card>
              <CardHeader
                title="Pickups in progress"
                action={
                  <Link to="/pickups" className="small">
                    View all
                  </Link>
                }
              />
              <div className="card-body stack-sm">
                {myPickups.loading ? (
                  <LoadingBlock label="Loading pickups…" />
                ) : myPickups.data?.items?.length ? (
                  myPickups.data.items.slice(0, 4).map((task) => (
                    <div key={idOf(task)} className="spread">
                      <div>
                        <Link to={`/pickups/${idOf(task)}`} className="small strong">
                          {task.donation?.title || 'Pickup'}
                        </Link>
                        <div className="tiny muted">
                          Window {formatDate(task.windowStart, { withTime: true })}
                        </div>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))
                ) : (
                  <p className="small muted">No pickups assigned to you yet.</p>
                )}
                {pickups ? (
                  <p className="tiny muted">
                    {pickups.attemptedPickups ?? 0} attempted · {pickups.failedPickups ?? 0} failed · average delay{' '}
                    {pickups.averageDelayMinutes ?? 0} min
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}

          {isDonor ? (
            <Card>
              <CardHeader title="Your recent listings" action={<Link to="/donations/mine" className="small">View all</Link>} />
              <div className="card-body stack">
                {myDonations.loading ? (
                  <LoadingBlock label="Loading listings…" />
                ) : myDonations.data?.items?.length ? (
                  myDonations.data.items.slice(0, 3).map((donation) => (
                    <div key={idOf(donation)} className="stack-sm">
                      <div className="spread">
                        <Link to={`/donations/${idOf(donation)}`} className="small strong">
                          {donation.title}
                        </Link>
                        <StatusBadge status={donation.status} />
                      </div>
                      <AllocationMeter
                        quantity={donation.quantity}
                        available={donation.availableQuantity}
                        reserved={donation.reservedQuantity}
                        collected={donation.collectedQuantity}
                        label={formatQuantity(donation.quantity, donation.unit)}
                      />
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Package}
                    title="No listings yet"
                    description="Publish surplus food to start matching with verified recipients."
                    action={<LinkButton to="/donations/new" size="sm">Publish surplus</LinkButton>}
                  />
                )}
              </div>
            </Card>
          ) : null}

          {isRecipient ? (
            <Card>
              <CardHeader title="Available near you" action={<Link to="/marketplace" className="small">Open marketplace</Link>} />
              <div className="card-body stack-sm">
                {openDemand.loading ? (
                  <LoadingBlock label="Loading nearby food…" />
                ) : openDemand.data?.items?.length ? (
                  openDemand.data.items.map((donation) => (
                    <div key={idOf(donation)} className="spread">
                      <div>
                        <Link to={`/donations/${idOf(donation)}`} className="small strong">
                          {donation.title}
                        </Link>
                        <div className="tiny muted">
                          {formatQuantity(donation.remainingQuantity, donation.unit)} remaining ·{' '}
                          {donation.donor?.name}
                        </div>
                      </div>
                      <LinkButton to={`/donations/${idOf(donation)}`} size="sm" variant="secondary">
                        View
                      </LinkButton>
                    </div>
                  ))
                ) : (
                  <p className="small muted">No open listings right now. Try widening your filters in the marketplace.</p>
                )}
              </div>
            </Card>
          ) : null}

          {isAdmin ? (
            <Card>
              <CardHeader title="Administration" subtitle="Platform-wide tools" />
              <div className="card-body stack-sm">
                <LinkButton to="/admin" variant="secondary" icon={Users} className="btn-block">
                  Platform overview
                </LinkButton>
                <LinkButton to="/admin/verification" variant="secondary" icon={ClipboardList} className="btn-block">
                  Verification queue
                </LinkButton>
                <LinkButton to="/admin/incidents" variant="secondary" icon={AlertTriangle} className="btn-block">
                  Incidents
                </LinkButton>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Quick actions" />
            <div className="card-body stack-sm">
              {isDonor ? (
                <>
                  <LinkButton to="/donations/new" variant="secondary" icon={Package} className="btn-block">
                    Publish surplus food
                  </LinkButton>
                  <LinkButton to="/predictions" variant="secondary" icon={Sparkles} className="btn-block">
                    Forecast next surplus
                  </LinkButton>
                </>
              ) : null}
              {isRecipient ? (
                <>
                  <LinkButton to="/marketplace" variant="secondary" icon={Search} className="btn-block">
                    Browse available food
                  </LinkButton>
                  <LinkButton to="/demand-requests" variant="secondary" icon={ClipboardList} className="btn-block">
                    Post a demand request
                  </LinkButton>
                </>
              ) : null}
              <LinkButton to="/pickups" variant="secondary" icon={Truck} className="btn-block">
                Open the pickup queue
              </LinkButton>
              <Button
                variant="ghost"
                className="btn-block"
                onClick={() => {
                  overview.reload();
                  myReservations.reload();
                  myPickups.reload();
                }}
              >
                Refresh statistics
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
