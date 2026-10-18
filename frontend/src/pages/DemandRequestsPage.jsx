import { useState } from 'react';
import { HeartHandshake, Plus, TrendingUp, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { demandApi } from '../api/resources.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  formatDate,
  formatQuantity,
  humanize,
} from '../components/ui.jsx';
import {
  DIETARY_CLASSIFICATIONS,
  FOOD_CATEGORIES,
  MEAL_PERIODS,
  UNITS,
  toOptions,
} from '../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

function inputDate(hoursFromNow) {
  const date = new Date(Date.now() + hoursFromNow * 3600_000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const blankForm = () => ({
  title: '',
  notes: '',
  requiredQuantity: 100,
  unit: 'PORTIONS',
  foodCategories: ['PREPARED_MEAL'],
  dietaryPreferences: [],
  mealPeriod: 'LUNCH',
  neededFrom: inputDate(20),
  neededUntil: inputDate(28),
  peopleServed: 100,
  canSelfPickup: true,
  maxStoragePortions: 200,
});

/** Recipient demand: what the kitchen needs, and the forecast behind it. */
export function DemandRequestsPage() {
  const { organization } = useAuth();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const mine = useApi(() => demandApi.mine({ limit: 20 }), []);
  const open = useApi(() => demandApi.open({ limit: 10 }), []);
  const forecast = useApi(() => demandApi.forecast({ mealPeriod: form.mealPeriod }), [form.mealPeriod]);

  function toggleArrayField(field, value) {
    setForm((current) => {
      const list = current[field] || [];
      return {
        ...current,
        [field]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.foodCategories.length) {
      toast.warning('Choose at least one food category you can accept.');
      return;
    }
    setBusy(true);
    try {
      await demandApi.create({
        title: form.title,
        notes: form.notes,
        requiredQuantity: Number(form.requiredQuantity),
        unit: form.unit,
        foodCategories: form.foodCategories,
        dietaryPreferences: form.dietaryPreferences,
        mealPeriod: form.mealPeriod,
        neededFrom: new Date(form.neededFrom).toISOString(),
        neededUntil: new Date(form.neededUntil).toISOString(),
        peopleServed: Number(form.peopleServed) || 0,
        canSelfPickup: Boolean(form.canSelfPickup),
        maxStoragePortions: Number(form.maxStoragePortions) || 0,
      });
      toast.success('Demand request posted. Donors can now see what your kitchen needs.');
      setCreateOpen(false);
      setForm(blankForm());
      mine.reload();
      open.reload();
    } catch (error) {
      toast.error(error.message, { title: 'Could not post the request' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      await demandApi.cancel(idOf(cancelTarget));
      toast.success('Demand request cancelled.');
      setCancelTarget(null);
      mine.reload();
      open.reload();
    } catch (error) {
      toast.error(error.message, { title: 'Could not cancel the request' });
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'title',
      header: 'Request',
      render: (row) => (
        <div>
          <span className="strong">{row.title}</span>
          <div className="tiny muted">
            {(row.foodCategories || []).map(humanize).join(', ')}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Needed',
      render: (row) => (
        <div>
          <span>{formatQuantity(row.requiredQuantity, row.unit)}</span>
          <div className="tiny muted">fulfilled {formatQuantity(row.fulfilledQuantity || 0, row.unit)}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'window',
      header: 'Needed between',
      render: (row) => (
        <span className="small">
          {formatDate(row.neededFrom)} → {formatDate(row.neededUntil)}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'Pickup',
      render: (row) => (
        <Badge variant={row.canSelfPickup ? 'success' : 'neutral'}>
          {row.canSelfPickup ? 'Self pickup' : 'Needs delivery'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) =>
        ['OPEN', 'PARTIALLY_FULFILLED'].includes(row.status) ? (
          <Button size="sm" variant="outline-danger" icon={XCircle} onClick={() => setCancelTarget(row)}>
            Cancel
          </Button>
        ) : (
          <span className="tiny muted">{humanize(row.status)}</span>
        ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="What our kitchen needs"
        subtitle={`Demand requests let donor organizations know what ${organization?.name || 'your kitchen'} can accept and when.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
            Post a request
          </Button>
        }
      />

      <div className="grid grid-3">
        <StatCard
          label="Open requests"
          value={(mine.data?.items || []).filter((r) => ['OPEN', 'PARTIALLY_FULFILLED'].includes(r.status)).length}
          hint="Currently visible to donors"
          icon={HeartHandshake}
        />
        <StatCard
          label="Total requested"
          value={(mine.data?.items || []).length}
          hint="All statuses"
          icon={HeartHandshake}
        />
        <StatCard
          label="Forecast estimate"
          value={forecast.data?.insufficientData === false ? `${forecast.data.estimate}` : '—'}
          hint={
            forecast.data?.insufficientData === false
              ? `${forecast.data.samplesUsed} samples · ${humanize(forecast.data.mealPeriod)}`
              : forecast.data?.message || 'Not enough history'
          }
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-sidebar mt-5">
        <Card>
          <CardHeader title="Our demand requests" subtitle="Requests you have posted, newest first." />
          <div className="card-body" style={{ padding: mine.loading ? undefined : 0 }}>
            {mine.error ? (
              <Alert variant="danger" title="Requests could not be loaded">
                {mine.error.message}
              </Alert>
            ) : mine.loading ? (
              <LoadingBlock label="Loading your requests…" />
            ) : mine.data?.items?.length ? (
              <DataTable columns={columns} rows={mine.data.items} caption="Your demand requests" />
            ) : (
              <EmptyState
                icon={HeartHandshake}
                title="No demand requests yet"
                description="Tell donors what your kitchen needs. Requests include the quantity, the food categories you can use, and the window in which you can collect."
                action={
                  <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
                    Post your first request
                  </Button>
                }
              />
            )}
          </div>
        </Card>

        <div className="stack">
          <Card>
            <CardHeader
              title="Demand forecast"
              subtitle="Averages your recent requests for the selected meal period."
              action={
                <Select
                  label=""
                  aria-label="Meal period for the forecast"
                  value={form.mealPeriod}
                  onChange={(event) => setForm((f) => ({ ...f, mealPeriod: event.target.value }))}
                  options={toOptions(MEAL_PERIODS)}
                />
              }
            />
            <div className="card-body stack-sm">
              {forecast.loading ? (
                <LoadingBlock label="Estimating demand…" />
              ) : forecast.error ? (
                <Alert variant="warning" title="Forecast unavailable">
                  {forecast.error.message}
                </Alert>
              ) : forecast.data?.insufficientData ? (
                <p className="small muted">
                  {forecast.data.message ||
                    'Not enough request history yet to estimate demand. Post and fulfil a few requests first — nothing is guessed.'}
                </p>
              ) : (
                <>
                  <div className="spread">
                    <div>
                      <div className="stat-label">Estimated need</div>
                      <div className="stat-value">
                        {forecast.data.estimate} {String(forecast.data.unit || '').toLowerCase()}
                      </div>
                    </div>
                    <Badge variant="info">{forecast.data.samplesUsed} samples</Badge>
                  </div>
                  {forecast.data.unfulfilled ? (
                    <p className="small muted">Outstanding unfulfilled requests: {forecast.data.unfulfilled}</p>
                  ) : null}
                  {forecast.data.recurring?.length ? (
                    <div className="small">
                      <strong>Recurring pattern:</strong>{' '}
                      {forecast.data.recurring.map((r) => `${r.day} (${r.occurrences}×)`).join(', ')}
                    </div>
                  ) : null}
                  <p className="tiny muted">{forecast.data.message}</p>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="What other kitchens need" subtitle="Anonymised view of open demand across the platform." />
            <div className="card-body stack-sm">
              {open.loading ? (
                <LoadingBlock label="Loading open requests…" />
              ) : open.data?.items?.length ? (
                open.data.items.map((request) => (
                  <div key={idOf(request)} className="stack-sm" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
                    <span className="small strong">{request.title}</span>
                    <span className="tiny muted">
                      {formatQuantity(request.requiredQuantity, request.unit)} ·{' '}
                      {(request.foodCategories || []).map(humanize).join(', ')}
                    </span>
                    <span className="tiny muted">
                      {formatDate(request.neededFrom)} → {formatDate(request.neededUntil)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="small muted">No other open requests right now.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Post a demand request"
        size="lg"
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={busy}>
              Post request
            </Button>
          </div>
        }
      >
        <form className="form-grid" onSubmit={submit}>
          <Input
            label="Request title"
            required
            className="span-2"
            placeholder="e.g. Evening meals for 120 people"
            value={form.title}
            onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
          />
          <Input
            label="Quantity needed"
            type="number"
            min="1"
            required
            value={form.requiredQuantity}
            onChange={(event) => setForm((f) => ({ ...f, requiredQuantity: event.target.value }))}
          />
          <Select
            label="Unit"
            value={form.unit}
            onChange={(event) => setForm((f) => ({ ...f, unit: event.target.value }))}
            options={toOptions(UNITS)}
          />
          <Input
            label="Needed from"
            type="datetime-local"
            required
            value={form.neededFrom}
            onChange={(event) => setForm((f) => ({ ...f, neededFrom: event.target.value }))}
          />
          <Input
            label="Needed until"
            type="datetime-local"
            required
            value={form.neededUntil}
            onChange={(event) => setForm((f) => ({ ...f, neededUntil: event.target.value }))}
          />
          <Select
            label="Meal period"
            value={form.mealPeriod}
            onChange={(event) => setForm((f) => ({ ...f, mealPeriod: event.target.value }))}
            options={toOptions(MEAL_PERIODS)}
          />
          <Input
            label="People served"
            type="number"
            min="0"
            value={form.peopleServed}
            onChange={(event) => setForm((f) => ({ ...f, peopleServed: event.target.value }))}
          />
          <Input
            label="Maximum storage (portions)"
            type="number"
            min="0"
            value={form.maxStoragePortions}
            onChange={(event) => setForm((f) => ({ ...f, maxStoragePortions: event.target.value }))}
          />

          <div className="span-2 field">
            <span className="field-label">Food categories you can accept *</span>
            <div className="row-wrap">
              {FOOD_CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={`chip chip-button ${form.foodCategories.includes(category) ? 'chip-active' : ''}`}
                  aria-pressed={form.foodCategories.includes(category)}
                  onClick={() => toggleArrayField('foodCategories', category)}
                >
                  {humanize(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="span-2 field">
            <span className="field-label">Dietary preferences</span>
            <div className="row-wrap">
              {DIETARY_CLASSIFICATIONS.map((diet) => (
                <button
                  type="button"
                  key={diet}
                  className={`chip chip-button ${form.dietaryPreferences.includes(diet) ? 'chip-active' : ''}`}
                  aria-pressed={form.dietaryPreferences.includes(diet)}
                  onClick={() => toggleArrayField('dietaryPreferences', diet)}
                >
                  {humanize(diet)}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Notes for donors"
            className="span-2"
            rows={2}
            value={form.notes}
            onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
            hint="Opening hours, who to contact, any constraints on what you can accept."
          />

          <label className="checkbox-row span-2" htmlFor="canSelfPickup">
            <input
              id="canSelfPickup"
              type="checkbox"
              checked={form.canSelfPickup}
              onChange={(event) => setForm((f) => ({ ...f, canSelfPickup: event.target.checked }))}
            />
            <span>
              <span className="strong small" style={{ display: 'block' }}>
                We can collect the food ourselves
              </span>
              <span className="tiny muted">
                Leave this off if you need a volunteer or delivery partner to bring it to you.
              </span>
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel this demand request?"
        confirmLabel="Cancel request"
        loading={busy}
      >
        <p className="small">
          {cancelTarget?.title} will be withdrawn. You can post a new request at any time.
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default DemandRequestsPage;
