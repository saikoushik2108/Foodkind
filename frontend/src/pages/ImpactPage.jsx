import { useState } from 'react';
import { BarChart3, Download, Leaf, Package, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi, predictionApi } from '../api/resources.js';
import { useApi } from '../hooks/useApi.js';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Input,
  LoadingBlock,
  PageHeader,
  StatCard,
  humanize,
} from '../components/ui.jsx';
import { CategoryPieChart, ComparisonBarChart, SurplusAreaChart, TrendLineChart } from '../components/Charts.jsx';

/** Confirmed impact and operating analytics for the signed-in organization. */
export function ImpactPage() {
  const { isDonor, isRecipient } = useAuth();
  const [range, setRange] = useState({ from: '', to: '' });

  const impact = useApi(() => analyticsApi.impact({ from: range.from || undefined, to: range.to || undefined }), [range]);
  const donations = useApi(() => analyticsApi.donations({ from: range.from || undefined, to: range.to || undefined }), [range]);
  const pickups = useApi(() => analyticsApi.pickups({ from: range.from || undefined, to: range.to || undefined }), [range]);
  const forecasts = useApi(() => predictionApi.metrics(), []);

  const totals = impact.data?.totals;

  const statusRows = (impact.data?.statusDistribution || []).map((row) => ({
    status: row.status,
    count: row.count,
  }));

  const categoryData = (donations.data?.donationsByCategory || []).map((row) => ({
    label: humanize(row.category),
    value: row.count,
  }));

  const trendData = (donations.data?.statusTrend || []).map((row) => ({
    label: row.date.slice(5),
    published: row.published,
  }));

  const pickupRows = (pickups.data?.statusDistribution || []).map((row) => ({
    status: row.status,
    count: row.count,
  }));

  return (
    <div className="page">
      <PageHeader
        title="Impact analytics"
        subtitle="Only deliveries a recipient has confirmed are counted here. Estimates and unverified quantities are never added to the headline figures."
        actions={
          <a className="btn btn-secondary btn-sm" href={analyticsApi.exportUrl(range)} download>
            <Download size={16} aria-hidden="true" />
            Export CSV
          </a>
        }
      />

      <Card className="mb-5" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-body">
          <div className="form-grid">
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
            <div className="field span-2" style={{ justifyContent: 'flex-end' }}>
              <span className="field-label">Range</span>
              <div className="row">
                <Button variant="secondary" size="sm" onClick={() => setRange({ from: '', to: '' })}>
                  Reset to all time
                </Button>
                <Button variant="ghost" size="sm" onClick={() => impact.reload()}>
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {impact.error ? (
        <Alert variant="danger" title="Impact statistics could not be loaded">
          {impact.error.message}
        </Alert>
      ) : null}

      <div className="grid grid-4">
        {impact.loading && !totals ? (
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
              icon={Target}
            />
            <StatCard
              label="Completion rate"
              value={totals?.completionRate === null || totals?.completionRate === undefined ? '—' : `${totals.completionRate}%`}
              hint="Completed ÷ published"
              icon={TrendingUp}
            />
          </>
        )}
      </div>
      <p className="tiny muted mt-3">{totals?.note}</p>

      <div className="grid grid-2 mt-5">
        <Card>
          <CardHeader title="Listings published over time" subtitle="Daily publishing volume in the selected range." />
          <div className="card-body">
            <SurplusAreaChart
              data={trendData}
              series={[{ key: 'published', name: 'Listings published' }]}
              height={250}
              title=""
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Listings by category" subtitle="How many listings fall into each food category." />
          <div className="card-body">
            <CategoryPieChart data={categoryData} title="" height={250} />
          </div>
        </Card>
      </div>

      <div className="grid grid-2 mt-5">
        <Card>
          <CardHeader title="Donation pipeline" subtitle="Current distribution of listing statuses." />
          <div className="card-body">
            {statusRows.length ? (
              <ComparisonBarChart
                layout="vertical"
                data={statusRows.map((row) => ({ label: humanize(row.status), value: row.count }))}
                series={[{ key: 'value', name: 'Listings' }]}
                height={Math.max(200, statusRows.length * 34)}
                title=""
              />
            ) : (
              <EmptyState icon={BarChart3} title="No listings in this range" description="Adjust the date range to see activity." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pickup performance" subtitle="How reliably collections are completed." />
          <div className="card-body stack">
            {pickups.loading ? (
              <LoadingBlock label="Loading pickup analytics…" />
            ) : (
              <>
                <DataTable
                  columns={[
                    { key: 'metric', header: 'Metric' },
                    { key: 'value', header: 'Value', align: 'right' },
                  ]}
                  rows={[
                    { id: 'attempted', metric: 'Pickups attempted', value: pickups.data?.attemptedPickups ?? 0 },
                    {
                      id: 'rate',
                      metric: 'Successful pickup rate',
                      value:
                        pickups.data?.successfulPickupRate === null || pickups.data?.successfulPickupRate === undefined
                          ? '—'
                          : `${pickups.data.successfulPickupRate}%`,
                    },
                    { id: 'failed', metric: 'Failed pickups', value: pickups.data?.failedPickups ?? 0 },
                    { id: 'avg', metric: 'Average delay (minutes)', value: pickups.data?.averageDelayMinutes ?? 0 },
                    { id: 'max', metric: 'Longest delay (minutes)', value: pickups.data?.maxDelayMinutes ?? 0 },
                    { id: 'late', metric: 'Late arrivals', value: pickups.data?.latePickups ?? 0 },
                  ]}
                  keyField="id"
                />
                {pickupRows.length ? (
                  <ComparisonBarChart
                    data={pickupRows.map((row) => ({ label: humanize(row.status), value: row.count }))}
                    series={[{ key: 'value', name: 'Tasks' }]}
                    height={200}
                    title=""
                  />
                ) : null}
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5" style={{ marginTop: 'var(--space-5)' }}>
        <CardHeader
          title="Forecast accuracy"
          subtitle="How close surplus predictions have been to reality, once actuals are recorded."
        />
        <div className="card-body">
          {forecasts.loading ? (
            <LoadingBlock label="Loading forecast metrics…" />
          ) : forecasts.data?.evaluatedCount ? (
            <>
              <div className="grid grid-3">
                <StatCard label="Evaluated forecasts" value={forecasts.data.evaluatedCount} icon={Target} />
                <StatCard label="Mean absolute error" value={forecasts.data.mae} hint="Lower is better" icon={BarChart3} />
                <StatCard
                  label="Mean % error"
                  value={forecasts.data.meanPercentageError === null ? '—' : `${forecasts.data.meanPercentageError}%`}
                  icon={TrendingUp}
                />
              </div>
              <p className="tiny muted mt-3">{forecasts.data.message}</p>
            </>
          ) : (
            <>
              <TrendLineChart data={[]} series={[]} title="" height={200} />
              <p className="small muted">{forecasts.data?.message || 'Record actual surplus to score the forecasts.'}</p>
              {isDonor ? (
                <p className="small muted">
                  Recording the actual quantity after each service is what makes this number meaningful.
                </p>
              ) : null}
              {isRecipient ? (
                <p className="small muted">
                  Forecast accuracy belongs to donor organizations. Your reservation history is shown above.
                </p>
              ) : null}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ImpactPage;
