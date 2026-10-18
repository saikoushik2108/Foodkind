import { useState } from 'react';
import { BarChart3, Building2, Download, Leaf, Package, Truck } from 'lucide-react';
import { adminApi, analyticsApi } from '../../api/resources.js';
import { useApi } from '../../hooks/useApi.js';
import {
  Alert,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Input,
  LoadingBlock,
  PageHeader,
  StatCard,
  humanize,
} from '../../components/ui.jsx';
import { CategoryPieChart, ComparisonBarChart, SurplusAreaChart } from '../../components/Charts.jsx';

/** Platform-wide analytics for administrators. */
export function AdminAnalyticsPage() {
  const [range, setRange] = useState({ from: '', to: '' });

  const impact = useApi(() => adminApi.impact({ from: range.from || undefined, to: range.to || undefined }), [range]);
  const donations = useApi(() => analyticsApi.donations({ from: range.from || undefined, to: range.to || undefined }), [range]);
  const organizations = useApi(() => analyticsApi.organizations({ from: range.from || undefined, to: range.to || undefined, limit: 10 }), [range]);
  const pickups = useApi(() => analyticsApi.pickups({ from: range.from || undefined, to: range.to || undefined }), [range]);

  const totals = impact.data?.totals;

  const statusRows = (impact.data?.statusDistribution || []).map((row) => ({
    label: humanize(row.status),
    value: row.count,
  }));

  const categoryData = (donations.data?.donationsByCategory || []).map((row) => ({
    label: humanize(row.category),
    value: row.count,
  }));

  const trendData = (donations.data?.statusTrend || []).map((row) => ({
    label: row.date.slice(5),
    published: row.published,
  }));

  const orgRows = organizations.data?.organizations || organizations.data?.items || [];

  return (
    <div className="page">
      <PageHeader
        title="Platform analytics"
        subtitle="Aggregate redistribution performance. Confirmed deliveries only; nothing is estimated into the totals."
        actions={
          <a className="btn btn-secondary btn-sm" href={analyticsApi.exportUrl(range)} download>
            <Download size={16} aria-hidden="true" />
            Export donations CSV
          </a>
        }
      />

      <Card className="mb-5">
        <div className="card-body form-grid">
          <Input
            label="From date"
            type="date"
            value={range.from}
            onChange={(event) => setRange((r) => ({ ...r, from: event.target.value }))}
          />
          <Input
            label="To date"
            type="date"
            value={range.to}
            onChange={(event) => setRange((r) => ({ ...r, to: event.target.value }))}
          />
        </div>
      </Card>

      {impact.error ? (
        <Alert variant="danger" title="Platform analytics could not be loaded">
          {impact.error.message}
        </Alert>
      ) : null}

      <div className="grid grid-4">
        <StatCard
          label="Portions redistributed"
          value={(totals?.portionsRedistributed ?? 0).toLocaleString()}
          hint="Confirmed deliveries"
          icon={Leaf}
        />
        <StatCard
          label="Kilograms redistributed"
          value={(totals?.kilogramsRedistributed ?? 0).toLocaleString()}
          hint="Confirmed deliveries"
          icon={Package}
        />
        <StatCard
          label="Completed donations"
          value={(totals?.completedDonations ?? 0).toLocaleString()}
          hint={`of ${totals?.donationsPublished ?? 0} published`}
          icon={BarChart3}
        />
        <StatCard
          label="Pickups completed"
          value={pickups.data?.attemptedPickups ?? 0}
          hint={`${pickups.data?.failedPickups ?? 0} failed`}
          icon={Truck}
        />
      </div>

      <p className="tiny muted mt-3">{totals?.note}</p>

      <div className="grid grid-2 mt-5">
        <Card>
          <CardHeader title="Publishing volume" subtitle="Listings created per day across all organizations." />
          <div className="card-body">
            <SurplusAreaChart data={trendData} series={[{ key: 'published', name: 'Listings' }]} height={250} title="" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Donation status mix" subtitle="Where listings currently sit." />
          <div className="card-body">
            {statusRows.length ? (
              <ComparisonBarChart layout="vertical" data={statusRows} series={[{ key: 'value', name: 'Listings' }]} height={Math.max(220, statusRows.length * 32)} title="" />
            ) : (
              <EmptyState icon={BarChart3} title="No data in this range" description="Adjust the dates to include activity." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-2 mt-5">
        <Card>
          <CardHeader title="Food categories" subtitle="Distribution of listings by category." />
          <div className="card-body">
            <CategoryPieChart data={categoryData} height={260} title="" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Organization comparison" subtitle="Most active organizations by confirmed redistribution." />
          <div className="card-body" style={{ padding: 0 }}>
            {organizations.loading ? (
              <LoadingBlock label="Loading organizations…" />
            ) : orgRows.length ? (
              <DataTable
                columns={[
                  {
                    key: 'name',
                    header: 'Organization',
                    render: (row) => (
                      <div>
                        <span className="strong">{row.name || row.organization?.name}</span>
                        <div className="tiny muted">{humanize(row.type || row.organization?.type)}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'portions',
                    header: 'Portions',
                    align: 'right',
                    render: (row) => (row.portionsRedistributed ?? row.deliveredQuantity ?? 0).toLocaleString(),
                  },
                  {
                    key: 'donations',
                    header: 'Donations',
                    align: 'right',
                    render: (row) => (row.donations ?? row.count ?? 0).toLocaleString(),
                  },
                ]}
                rows={orgRows}
                caption="Organization comparison"
              />
            ) : (
              <EmptyState
                icon={Building2}
                title="Not enough data to compare"
                description="Once organizations have completed redistributions, they will be ranked here."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AdminAnalyticsPage;
