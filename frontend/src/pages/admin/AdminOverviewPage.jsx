import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  Package,
  ShieldCheck,
  Truck,
  Users,
  Utensils,
} from 'lucide-react';
import { adminApi } from '../../api/resources.js';
import { useApi } from '../../hooks/useApi.js';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  LinkButton,
  LoadingBlock,
  PageHeader,
  StatCard,
  humanize,
} from '../../components/ui.jsx';

/** Platform-wide health: verifications, live activity, and open incidents. */
export function AdminOverviewPage() {
  const { data, error, loading, reload } = useApi(() => adminApi.overview(), []);
  const pending = useApi(() => adminApi.pendingOrganizations({ limit: 5 }), []);

  return (
    <div className="page">
      <PageHeader
        title="Platform overview"
        subtitle="Operational counters drawn directly from the database, plus the queues that need a human decision."
        actions={
          <>
            <LinkButton to="/admin/verification" variant="primary" icon={Building2}>
              Verification queue
            </LinkButton>
            <Button variant="secondary" onClick={reload}>
              Refresh
            </Button>
          </>
        }
      />

      {error ? (
        <Alert variant="danger" title="Platform statistics could not be loaded">
          {error.message}
        </Alert>
      ) : null}

      <div className="grid grid-4">
        {loading && !data ? (
          <>
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
          </>
        ) : (
          <>
            <StatCard label="Organizations" value={data?.organizations ?? 0} hint={`${data?.pendingVerifications ?? 0} awaiting verification`} icon={Building2} />
            <StatCard label="Registered users" value={data?.totalUsers ?? 0} icon={Users} />
            <StatCard label="Donations" value={data?.donations ?? 0} hint={`${data?.activeDonations ?? 0} available now`} icon={Package} />
            <StatCard
              label="Open incidents"
              value={data?.openIncidents ?? 0}
              hint={`${data?.incidents ?? 0} recorded in total`}
              icon={AlertTriangle}
              tone={data?.openIncidents ? 'warning' : 'default'}
            />
          </>
        )}
      </div>

      <div className="grid grid-4 mt-4">
        <StatCard label="Listings with a hold" value={data?.reservedDonations ?? 0} hint="Partially or fully reserved" icon={ClipboardList} />
        <StatCard label="Pickups in progress" value={data?.pickupsInProgress ?? 0} hint="Assigned, arrived, or collected" icon={Truck} />
        <StatCard
          label="Expiring within 24h"
          value={data?.expiringListings ?? 0}
          hint="Still open past their deadline soon"
          icon={AlertTriangle}
          tone={data?.expiringListings ? 'warning' : 'default'}
        />
        <StatCard label="Completed redistributions" value={data?.completedRedistributions ?? 0} icon={ShieldCheck} />
      </div>

      <div className="grid grid-3 mt-5">
        <Card>
          <CardHeader title="Verified impact" subtitle="Confirmed deliveries only — never estimated." />
          <div className="card-body stack-sm">
            <div className="spread">
              <span className="muted small">
                <Utensils size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> Portions
              </span>
              <strong>{(data?.verifiedImpact?.portionsRedistributed ?? 0).toLocaleString()}</strong>
            </div>
            <div className="spread">
              <span className="muted small">
                <Package size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> Kilograms
              </span>
              <strong>{(data?.verifiedImpact?.kilogramsRedistributed ?? 0).toLocaleString()}</strong>
            </div>
            <p className="tiny muted">{data?.verifiedImpact?.note}</p>
            <Link to="/admin/analytics" className="small">
              Open platform analytics
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Oldest pending verifications"
            subtitle="Newest organizations awaiting a decision."
            action={
              <Link to="/admin/verification" className="small">
                Queue
              </Link>
            }
          />
          <div className="card-body" style={{ padding: pending.loading ? undefined : 0 }}>
            {pending.loading ? (
              <LoadingBlock label="Loading the queue…" />
            ) : pending.data?.items?.length ? (
              <DataTable
                columns={[
                  { key: 'name', header: 'Organization' },
                  { key: 'city', header: 'City' },
                  { key: 'type', header: 'Type', render: (row) => humanize(row.type) },
                ]}
                rows={pending.data.items.slice(0, 5)}
                caption="Organizations awaiting verification"
              />
            ) : (
              <EmptyState
                icon={Building2}
                title="No organizations waiting"
                description="Every registered organization has a verification decision recorded."
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Administrative tools" />
          <div className="card-body stack-sm">
            <LinkButton to="/admin/users" variant="secondary" icon={Users} className="btn-block">
              Manage users
            </LinkButton>
            <LinkButton to="/admin/donations" variant="secondary" icon={Package} className="btn-block">
              Donation monitoring
            </LinkButton>
            <LinkButton to="/admin/pickups" variant="secondary" icon={Truck} className="btn-block">
              Pickup monitoring
            </LinkButton>
            <LinkButton to="/admin/incidents" variant="secondary" icon={AlertTriangle} className="btn-block">
              Incidents and disputes
            </LinkButton>
            <LinkButton to="/admin/audit" variant="secondary" icon={ShieldCheck} className="btn-block">
              Audit log
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AdminOverviewPage;
