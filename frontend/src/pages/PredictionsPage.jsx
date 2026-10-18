import { useState } from 'react';
import { BarChart3, Brain, CalendarPlus, Sparkles, Target } from 'lucide-react';
import { predictionApi } from '../api/resources.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  StatCard,
  Textarea,
  formatDate,
  humanize,
} from '../components/ui.jsx';
import { TrendLineChart } from '../components/Charts.jsx';
import { MEAL_PERIODS, UNITS, toOptions } from '../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

function tomorrowInput() {
  const date = new Date(Date.now() + 24 * 3600_000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Surplus forecasting and forecast evaluation for donor organizations. */
export function PredictionsPage() {
  const toast = useToast();
  const [form, setForm] = useState({
    targetDate: tomorrowInput(),
    mealPeriod: 'LUNCH',
    expectedCovers: 200,
    unit: 'PORTIONS',
  });
  const [forecast, setForecast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actualFor, setActualFor] = useState(null);
  const [actualValue, setActualValue] = useState('');

  const history = useApi(() => predictionApi.history({ limit: 20 }), []);
  const metrics = useApi(() => predictionApi.metrics(), []);

  async function generate(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const log = await predictionApi.surplus({
        targetDate: new Date(`${form.targetDate}T12:00:00`).toISOString(),
        mealPeriod: form.mealPeriod,
        expectedCovers: Number(form.expectedCovers) || 0,
        unit: form.unit,
      });
      setForecast(log);
      history.reload();
      if (log.insufficientData) {
        toast.info('Forecast produced, but there is not yet enough history for a reliable estimate.');
      } else {
        toast.success('Forecast generated from your recorded surplus history.');
      }
    } catch (error) {
      toast.error(error.message, { title: 'Could not generate a forecast' });
    } finally {
      setBusy(false);
    }
  }

  async function saveActual() {
    if (!actualFor) return;
    setBusy(true);
    try {
      await predictionApi.recordActual(idOf(actualFor), Number(actualValue));
      toast.success('Actual surplus recorded. The forecast is now evaluated against reality.');
      setActualFor(null);
      setActualValue('');
      history.reload();
      metrics.reload();
    } catch (error) {
      toast.error(error.message, { title: 'Could not record the actual quantity' });
    } finally {
      setBusy(false);
    }
  }

  const evaluated = (history.data?.items || []).filter((log) => log.actualQuantity !== null && log.actualQuantity !== undefined);

  const chartData = [...evaluated]
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
    .slice(-14)
    .map((log) => ({
      label: new Date(log.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      predicted: log.predictedQuantity,
      actual: log.actualQuantity,
    }));

  const columns = [
    {
      key: 'target',
      header: 'Target date',
      render: (row) => (
        <div>
          <span className="strong">{formatDate(row.targetDate)}</span>
          <div className="tiny muted">{humanize(row.mealPeriod)}</div>
        </div>
      ),
    },
    {
      key: 'predicted',
      header: 'Predicted',
      render: (row) => (
        <div>
          <span>{row.predictedQuantity}</span>
          {row.lowerBound !== null && row.upperBound !== null ? (
            <div className="tiny muted">
              range {row.lowerBound}–{row.upperBound}
            </div>
          ) : (
            <div className="tiny muted">no range</div>
          )}
        </div>
      ),
    },
    {
      key: 'actual',
      header: 'Actual',
      render: (row) =>
        row.actualQuantity === null || row.actualQuantity === undefined ? (
          <span className="faint">not recorded</span>
        ) : (
          <span className="strong">{row.actualQuantity}</span>
        ),
    },
    {
      key: 'error',
      header: 'Error',
      render: (row) => (row.absoluteError === null || row.absoluteError === undefined ? '—' : row.absoluteError),
    },
    {
      key: 'confidence',
      header: 'Data',
      render: (row) => (
        <Badge variant={row.insufficientData ? 'warning' : 'success'}>
          {row.insufficientData ? 'insufficient history' : `${row.features?.historicalSamples ?? 0} samples`}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) =>
        row.actualQuantity === null || row.actualQuantity === undefined ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setActualFor(row);
              setActualValue('');
            }}
          >
            Record actual
          </Button>
        ) : (
          <span className="tiny muted">evaluated</span>
        ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Surplus forecasting"
        subtitle="Estimate how much food you are likely to have spare, based on your own recorded history. Forecasts are statistical estimates and are flagged when the data is thin."
      />

      <div className="grid grid-4">
        <StatCard
          label="Evaluated forecasts"
          value={metrics.data?.evaluatedCount ?? 0}
          hint="Forecasts with a recorded actual"
          icon={Target}
        />
        <StatCard
          label="Mean absolute error"
          value={metrics.data?.mae === null || metrics.data?.mae === undefined ? '—' : metrics.data.mae}
          hint="Lower is better"
          icon={BarChart3}
        />
        <StatCard
          label="Mean % error"
          value={
            metrics.data?.meanPercentageError === null || metrics.data?.meanPercentageError === undefined
              ? '—'
              : `${metrics.data.meanPercentageError}%`
          }
          hint="Only over non-zero actuals"
          icon={Brain}
        />
        <StatCard label="Method" value={metrics.data?.modelVersion || '—'} hint={metrics.data?.method || 'not yet evaluated'} icon={Sparkles} />
      </div>

      <p className="tiny muted mt-3">{metrics.data?.message || 'Metrics are computed only from forecasts with recorded actuals.'}</p>

      <div className="grid grid-sidebar mt-5">
        <div className="stack">
          <Card>
            <CardHeader title="Generate a forecast" subtitle="Only past records with a recorded actual are used." />
            <form className="card-body form-grid" onSubmit={generate}>
              <Input
                label="Target date"
                type="date"
                required
                value={form.targetDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setForm((f) => ({ ...f, targetDate: event.target.value }))}
                hint="Forecasting the past is not possible."
              />
              <Select
                label="Meal period"
                value={form.mealPeriod}
                onChange={(event) => setForm((f) => ({ ...f, mealPeriod: event.target.value }))}
                options={toOptions(MEAL_PERIODS)}
              />
              <Input
                label="Expected covers"
                type="number"
                min="0"
                value={form.expectedCovers}
                onChange={(event) => setForm((f) => ({ ...f, expectedCovers: event.target.value }))}
                hint="How many people you expect to serve — scales the estimate."
              />
              <Select
                label="Unit"
                value={form.unit}
                onChange={(event) => setForm((f) => ({ ...f, unit: event.target.value }))}
                options={toOptions(UNITS)}
              />
              <div className="span-2">
                <Button type="submit" variant="primary" icon={CalendarPlus} loading={busy}>
                  Forecast surplus
                </Button>
              </div>
            </form>
          </Card>

          {forecast ? (
            <Card>
              <CardHeader
                title="Latest forecast"
                subtitle={`${formatDate(forecast.targetDate)} · ${humanize(forecast.mealPeriod)}`}
                action={
                  <Badge variant={forecast.insufficientData ? 'warning' : 'success'}>
                    {forecast.insufficientData ? 'Low confidence' : 'Grounded in history'}
                  </Badge>
                }
              />
              <div className="card-body stack">
                <div className="spread">
                  <div>
                    <div className="stat-label">Predicted surplus</div>
                    <div className="stat-value">
                      {forecast.predictedQuantity} {String(forecast.unit || '').toLowerCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="stat-label">Range</div>
                    <div className="strong">
                      {forecast.lowerBound === null
                        ? 'not available'
                        : `${forecast.lowerBound} – ${forecast.upperBound}`}
                    </div>
                  </div>
                </div>

                <Alert variant={forecast.insufficientData ? 'warning' : 'info'} title="Why this number">
                  {forecast.explanation}
                </Alert>

                <dl className="detail-list">
                  <div>
                    <dt>Historical samples</dt>
                    <dd>{forecast.features?.historicalSamples ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Day of week</dt>
                    <dd>{forecast.features?.dayOfWeek || '—'}</dd>
                  </div>
                  <div>
                    <dt>Weighted average</dt>
                    <dd>{forecast.features?.weightedAverage ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Same-weekday average</dt>
                    <dd>{forecast.features?.dayOfWeekAverage ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Model</dt>
                    <dd>
                      {forecast.method} · {forecast.modelVersion}
                    </dd>
                  </div>
                  <div>
                    <dt>Generated</dt>
                    <dd>{formatDate(forecast.predictedAt, { withTime: true })}</dd>
                  </div>
                </dl>

                <div className="row-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActualFor(forecast);
                      setActualValue('');
                    }}
                  >
                    Record what actually happened
                  </Button>
                  <a
                    className="btn btn-secondary btn-sm"
                    href={`/donations/new?predictionLog=${idOf(forecast)}`}
                  >
                    Publish surplus from this forecast
                  </a>
                </div>
              </div>
            </Card>
          ) : (
            <Alert variant="info" title="No forecast generated in this session">
              Generate one to see how the estimate is produced, and to link a listing back to the prediction that
              suggested it.
            </Alert>
          )}

          <Card>
            <CardHeader title="Predicted versus actual" subtitle="Recorded actual quantities only." />
            <div className="card-body">
              <TrendLineChart
                data={chartData}
                series={[
                  { key: 'predicted', name: 'Predicted', color: '#14532d' },
                  { key: 'actual', name: 'Actual', color: '#16a34a' },
                ]}
                height={280}
                title=""
              />
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHeader title="How the estimate is built" />
            <div className="card-body stack-sm small muted">
              <p>
                A weighted moving average of your recorded surplus, where recent weeks count more than older ones. When
                you have at least three records on the same weekday, that weekday&apos;s average is blended in.
              </p>
              <p>
                Expected covers scale the result when you have enough cover history. The range shown is one standard
                deviation of recent surpluses — how much your surplus normally varies.
              </p>
              <p className="strong">Honesty rules built in:</p>
              <ul className="stack-sm" style={{ paddingLeft: '1.1rem' }}>
                <li>Fewer than three records: a plain average, clearly flagged as a rough hint.</li>
                <li>Fewer than eight records: the forecast is marked low confidence.</li>
                <li>No records at all: an explicit message instead of a fabricated number.</li>
                <li>Accuracy metrics stay empty until you record actuals.</li>
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent forecasts" subtitle="Record the actual surplus so the model can be scored." />
            <div className="card-body" style={{ padding: history.loading ? undefined : 0 }}>
              {history.loading ? (
                <LoadingBlock label="Loading forecast history…" />
              ) : history.data?.items?.length ? (
                <DataTable columns={columns} rows={history.data.items.slice(0, 8)} caption="Surplus forecast history" />
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No forecasts yet"
                  description="Generate a forecast to start building a record the platform can score itself against."
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      {actualFor ? (
        <Card className="mt-5">
          <CardHeader title="Record the actual surplus" subtitle="This evaluates the forecast and improves future estimates." />
          <div className="card-body stack-sm">
            <Textarea
              label={`Actual quantity for ${formatDate(actualFor.targetDate)} (${humanize(actualFor.mealPeriod)})`}
              rows={1}
              value={actualValue}
              onChange={(event) => setActualValue(event.target.value)}
            />
            <div className="row">
              <Button variant="primary" onClick={saveActual} loading={busy}>
                Save actual
              </Button>
              <Button variant="secondary" onClick={() => setActualFor(null)}>
                Cancel
              </Button>
            </div>
            <p className="tiny muted">
              An actual can be recorded once. Corrections are made by an administrator, so the evaluation history stays
              trustworthy.
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default PredictionsPage;
