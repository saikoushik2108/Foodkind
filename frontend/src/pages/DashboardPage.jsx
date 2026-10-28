import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  KeyRound,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Utensils,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi, donationApi, pickupApi, reservationApi, demandApi } from '../api/resources.js';
import { useApi } from '../hooks/useApi.js';
import {
  Alert,
  AllocationMeter,
  Badge,
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
  humanize,
  LoadingBlock,
} from '../components/ui.jsx';
import { ComparisonBarChart, SurplusAreaChart } from '../components/Charts.jsx';

const idOf = (record) => record?.id || record?._id;

/** Landing page for every signed-in user, assembled per role with seamless cross-dashboard integration. */
export function DashboardPage() {
  const { user, organization, isAdmin, isDonor, isRecipient, isPartner, isVolunteer, isAgent, isVerified } = useAuth();

  const overview = useApi(() => analyticsApi.overview(), []);
  const myDonations = useApi(() => (isDonor ? donationApi.mine({ limit: 5, sort: 'newest' }) : Promise.resolve(null)), [isDonor]);
  const myReservations = useApi(() => reservationApi.mine({ limit: 5 }), []);
  const myPickups = useApi(() => pickupApi.mine({ limit: 6 }), []);
  const openMarketplace = useApi(
    () => ((isRecipient || isAgent || isPartner) ? donationApi.list({ limit: 4, sort: 'deadline' }) : Promise.resolve(null)),
    [isRecipient, isAgent, isPartner]
  );
  const openDemand = useApi(
    () => ((isDonor || isAgent || isPartner || isAdmin) ? demandApi.open({ limit: 4 }) : Promise.resolve(null)),
    [isDonor, isAgent, isPartner, isAdmin]
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
  const roleLabel = isAdmin
    ? 'Platform Administrator'
    : isDonor
      ? 'Food Donor'
      : isRecipient
        ? 'Recipient Organization'
        : (isAgent || isPartner)
          ? 'Rescue & Logistics Agent'
          : 'Member';

  // Active in-progress pickups for agent/transporter
  const activeTasks = (myPickups.data?.items || []).filter((task) =>
    ['ASSIGNED', 'ARRIVED', 'COLLECTED'].includes(task.status)
  );

  return (
    <div className="page">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={
          organization
            ? `${organization.name} · ${organization.city || 'Bengaluru'} (${roleLabel})`
            : `Foodkind Surplus Redistribution · ${roleLabel}`
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
            {isAgent || isPartner ? (
              <>
                <LinkButton to="/pickups" variant="primary" icon={Truck}>
                  Rescue pickups
                </LinkButton>
                <LinkButton to="/marketplace" variant="secondary" icon={Search}>
                  Find surplus
                </LinkButton>
              </>
            ) : null}
            {isAdmin ? (
              <LinkButton to="/admin" variant="primary" icon={ShieldCheck}>
                Admin console
              </LinkButton>
            ) : null}
            <LinkButton to="/impact" variant="secondary" icon={BarChart3}>
              Impact
            </LinkButton>
          </>
        }
      />

      {/* Connected Dashboard Navigation Bar */}
      <div className="card card-pad mb-4" style={{ marginBottom: 'var(--space-4)', background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        <div className="spread">
          <span className="tiny muted uppercase strong" style={{ letterSpacing: '0.05em' }}>
            Connected Ecosystem Dashboards
          </span>
          <span className="tiny muted">All dashboards share real-time atomic inventory & verification</span>
        </div>
        <div className="row-wrap mt-2" style={{ gap: 'var(--space-2)' }}>
          <LinkButton
            to="/donations/mine"
            size="sm"
            variant={isDonor ? 'primary' : 'secondary'}
            icon={Package}
          >
            Donor Listings
          </LinkButton>
          <LinkButton
            to="/marketplace"
            size="sm"
            variant={isRecipient ? 'primary' : 'secondary'}
            icon={Search}
          >
            Recipient Marketplace
          </LinkButton>
          <LinkButton
            to="/pickups"
            size="sm"
            variant={(isAgent || isPartner) ? 'primary' : 'secondary'}
            icon={Truck}
          >
            Rescue Agent Dispatch
          </LinkButton>
          <LinkButton
            to="/predictions"
            size="sm"
            variant="secondary"
            icon={Sparkles}
          >
            AI Surplus Forecast
          </LinkButton>
          <LinkButton
            to="/reservations"
            size="sm"
            variant="secondary"
            icon={ClipboardList}
          >
            Reservations
          </LinkButton>
          {isAdmin ? (
            <LinkButton
              to="/admin"
              size="sm"
              variant="secondary"
              icon={ShieldCheck}
            >
              Admin Governance
            </LinkButton>
          ) : null}
        </div>
      </div>

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

      {/* 4 Core Stat Cards */}
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
              label={isDonor ? 'Listings published' : (isAgent || isPartner ? 'Pickups assigned' : 'Reservations made')}
              value={
                isDonor
                  ? (totals?.donationsPublished ?? 0).toLocaleString()
                  : (isAgent || isPartner)
                    ? (myPickups.data?.items?.length ?? pickups?.attemptedPickups ?? 0).toLocaleString()
                    : (reservations?.statusDistribution || []).reduce((sum, r) => sum + r.count, 0).toLocaleString()
              }
              hint={isDonor ? 'All statuses' : (isAgent || isPartner ? 'Rescue & transport tasks' : 'All statuses')}
              icon={ClipboardList}
            />
            <StatCard
              label={isAgent || isPartner ? 'On-time pickup rate' : 'Completion rate'}
              value={
                isAgent || isPartner
                  ? `${pickups?.successfulPickupRate ?? 100}%`
                  : totals?.completionRate === null || totals?.completionRate === undefined
                    ? '—'
                    : `${totals.completionRate}%`
              }
              hint={
                isAgent || isPartner
                  ? `${pickups?.failedPickups ?? 0} failed · ${pickups?.averageDelayMinutes ?? 0}m avg delay`
                  : isDonor
                    ? 'Completed ÷ published'
                    : `${pickups?.successfulPickupRate ?? '—'}% pickups successful`
              }
              icon={BarChart3}
            />
          </>
        )}
      </div>

      <p className="tiny muted mt-3">{totals?.note}</p>

      {/* Main Grid Content */}
      <div className="grid grid-sidebar mt-6">
        <div className="stack">
          {/* Agent Active Tasks Section */}
          {(isAgent || isPartner) ? (
            <Card>
              <CardHeader
                title="Active Rescue Missions"
                subtitle="Your live collection and delivery assignments on the road."
                action={
                  <Link to="/pickups" className="small">
                    Full queue ({myPickups.data?.items?.length ?? 0})
                  </Link>
                }
              />
              <div className="card-body stack">
                {myPickups.loading ? (
                  <LoadingBlock label="Loading active tasks…" />
                ) : activeTasks.length ? (
                  activeTasks.map((task) => (
                    <div
                      key={idOf(task)}
                      className="card card-pad stack-sm"
                      style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                    >
                      <div className="spread">
                        <div>
                          <Link to={`/pickups/${idOf(task)}`} className="strong">
                            {task.donation?.title || 'Food Pickup Task'}
                          </Link>
                          <div className="tiny muted">
                            <MapPin size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} />{' '}
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
                          Quantity: {formatQuantity(task.expectedQuantity, task.unit)}
                          {task.collectedQuantity ? ` · collected ${formatQuantity(task.collectedQuantity, task.unit)}` : ''}
                        </span>
                        <span>
                          Window: {formatDate(task.windowStart, { withTime: true })}
                        </span>
                        {task.handoverCode ? (
                          <span className="mono strong" style={{ color: 'var(--green-dark)' }}>
                            <KeyRound size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> Code: {task.handoverCode}
                          </span>
                        ) : null}
                      </div>

                      <div className="table-actions mt-2">
                        <LinkButton to={`/pickups/${idOf(task)}`} size="sm" variant="primary" icon={Truck}>
                          {task.status === 'ASSIGNED' ? 'Start collection' : task.status === 'ARRIVED' ? 'Enter handover code' : 'Deliver to recipient'}
                        </LinkButton>
                        {task.donation ? (
                          <LinkButton to={`/donations/${idOf(task.donation)}`} size="sm" variant="ghost">
                            View listing
                          </LinkButton>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Truck}
                    title="No active missions right now"
                    description="You are all caught up! Check the available food surplus marketplace to claim or transport food."
                    action={<LinkButton to="/marketplace" size="sm">Browse available surplus</LinkButton>}
                  />
                )}
              </div>
            </Card>
          ) : null}

          {/* Redistribution Activity Trend Chart */}
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

          {/* Donation Pipeline */}
          <Card>
            <CardHeader
              title="Donation pipeline"
              subtitle="Where listings currently sit in the redistribution lifecycle."
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

          {/* Open Shelter Demand (for donors and agents) */}
          {(isDonor || isAgent || isPartner || isAdmin) && openDemand.data?.items?.length ? (
            <Card>
              <CardHeader
                title="Community shelter demand"
                subtitle="Local food banks and shelters currently seeking meal support."
                action={
                  <Link to="/demand-requests" className="small">
                    View all requests
                  </Link>
                }
              />
              <div className="card-body stack-sm">
                {openDemand.data.items.slice(0, 3).map((req) => (
                  <div key={idOf(req)} className="spread" style={{ paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span className="small strong">{req.title}</span>
                      <div className="tiny muted">
                        {req.organization?.name || 'Shelter'} · Need {formatQuantity(req.quantityNeeded, req.unit)} · By {formatDate(req.neededBy, { withTime: true })}
                      </div>
                    </div>
                    <Badge variant="info">{humanize(req.category)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        {/* Right Sidebar Stack */}
        <div className="stack">
          {/* Reservations Card */}
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
                      <Link to="/reservations" className="small strong">
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

          {/* Pickups Card */}
          {(isPartner || isAgent || pickups?.attemptedPickups || myPickups.data?.items?.length) ? (
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

          {/* Donor Listings */}
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

          {/* Recipient & Agent: Available surplus near you */}
          {(isRecipient || isAgent || isPartner) ? (
            <Card>
              <CardHeader title="Available surplus near you" action={<Link to="/marketplace" className="small">Open marketplace</Link>} />
              <div className="card-body stack-sm">
                {openMarketplace.loading ? (
                  <LoadingBlock label="Loading nearby food…" />
                ) : openMarketplace.data?.items?.length ? (
                  openMarketplace.data.items.map((donation) => (
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

          {/* Admin Oversight Card */}
          {isAdmin ? (
            <Card>
              <CardHeader title="Administration" subtitle="Platform governance tools" />
              <div className="card-body stack-sm">
                <LinkButton to="/admin" variant="secondary" icon={Users} className="btn-block">
                  Platform overview
                </LinkButton>
                <LinkButton to="/admin/verification" variant="secondary" icon={ClipboardList} className="btn-block">
                  Verification queue
                </LinkButton>
                <LinkButton to="/admin/incidents" variant="secondary" icon={AlertTriangle} className="btn-block">
                  Incidents & disputes
                </LinkButton>
                <LinkButton to="/admin/analytics" variant="secondary" icon={BarChart3} className="btn-block">
                  Platform analytics
                </LinkButton>
              </div>
            </Card>
          ) : null}

          {/* Quick Actions Card */}
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
              {(isAgent || isPartner) ? (
                <>
                  <LinkButton to="/pickups" variant="secondary" icon={Truck} className="btn-block">
                    Rescue pickup missions
                  </LinkButton>
                  <LinkButton to="/marketplace" variant="secondary" icon={Search} className="btn-block">
                    Browse city surplus
                  </LinkButton>
                  <LinkButton to="/demand-requests" variant="secondary" icon={HeartHandshake} className="btn-block">
                    View shelter demand
                  </LinkButton>
                </>
              ) : null}
              <LinkButton to="/pickups" variant="secondary" icon={Truck} className="btn-block">
                Open pickup queue
              </LinkButton>
              <Button
                variant="ghost"
                className="btn-block"
                onClick={() => {
                  overview.reload();
                  myReservations.reload();
                  myPickups.reload();
                  if (openMarketplace.reload) openMarketplace.reload();
                  if (myDonations.reload) myDonations.reload();
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
