import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, LayoutGrid, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react';
import { donationApi } from '../api/resources.js';
import { useApi, usePagination } from '../hooks/useApi.js';
import {
  Alert,
  AllocationMeter,
  Badge,
  Button,
  Card,
  EmptyState,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Input,
  formatDate,
  formatQuantity,
  humanize,
} from '../components/ui.jsx';
import { MapView } from '../components/MapView.jsx';
import { DIETARY_CLASSIFICATIONS, FOOD_CATEGORIES, STORAGE_REQUIREMENTS, UNITS, toOptions } from '../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

const emptyFilters = {
  q: '',
  foodCategory: '',
  dietary: '',
  unit: '',
  storageRequirement: '',
  city: '',
  minQuantity: '',
  sort: 'deadline',
  selfPickupOnly: false,
};

/** Food discovery for recipient organizations. */
export function MarketplacePage() {
  const { pagination, setPage } = usePagination({ page: 1, limit: 12 });
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [view, setView] = useState('grid');

  const { data, error, loading, reload } = useApi(
    () =>
      donationApi.list({
        page: pagination.page,
        limit: pagination.limit,
        q: applied.q || undefined,
        foodCategory: applied.foodCategory || undefined,
        dietary: applied.dietary || undefined,
        unit: applied.unit || undefined,
        storageRequirement: applied.storageRequirement || undefined,
        city: applied.city || undefined,
        minQuantity: applied.minQuantity || undefined,
        sort: applied.sort,
        selfPickupOnly: applied.selfPickupOnly ? 'true' : undefined,
      }),
    [pagination.page, pagination.limit, applied]
  );

  const mapPoints = useMemo(
    () =>
      (data?.items || [])
        .filter((donation) => donation.collectionLocation)
        .map((donation) => ({
          position: donation.collectionLocation,
          label: donation.title,
          description: `${formatQuantity(donation.remainingQuantity, donation.unit)} remaining · ${donation.donor?.name || 'Donor'}`,
        })),
    [data]
  );

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  }

  const activeFilterCount = Object.entries(applied).filter(
    ([key, value]) => value && key !== 'sort'
  ).length;

  return (
    <div className="page">
      <PageHeader
        title="Find surplus food"
        subtitle="Verified listings from canteens, restaurants, hostels, caterers and event organizers near you. Reserve what your kitchen can genuinely collect and use."
        actions={
          <>
            <Button
              variant={view === 'grid' ? 'primary' : 'secondary'}
              size="sm"
              icon={LayoutGrid}
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
            >
              Cards
            </Button>
            <Button
              variant={view === 'map' ? 'primary' : 'secondary'}
              size="sm"
              icon={MapIcon}
              onClick={() => setView('map')}
              aria-pressed={view === 'map'}
            >
              Map
            </Button>
          </>
        }
      />

      <Card>
        <form className="card-body" onSubmit={applyFilters}>
          <div className="form-grid">
            <label className="field span-2">
              <span className="field-label">Search listings</span>
              <span className="row">
                <Search size={16} aria-hidden="true" />
                <input
                  className="input"
                  type="search"
                  placeholder="Title or description, e.g. biryani, sandwiches, fruit"
                  value={filters.q}
                  onChange={(event) => setFilters((f) => ({ ...f, q: event.target.value }))}
                />
              </span>
            </label>
            <Select
              label="Food category"
              value={filters.foodCategory}
              onChange={(event) => setFilters((f) => ({ ...f, foodCategory: event.target.value }))}
              options={[{ value: '', label: 'Any category' }, ...toOptions(FOOD_CATEGORIES)]}
            />
            <Select
              label="Dietary"
              value={filters.dietary}
              onChange={(event) => setFilters((f) => ({ ...f, dietary: event.target.value }))}
              options={[{ value: '', label: 'Any dietary type' }, ...toOptions(DIETARY_CLASSIFICATIONS)]}
            />
            <Select
              label="Storage requirement"
              value={filters.storageRequirement}
              onChange={(event) => setFilters((f) => ({ ...f, storageRequirement: event.target.value }))}
              options={[{ value: '', label: 'Any storage' }, ...toOptions(STORAGE_REQUIREMENTS)]}
            />
            <Select
              label="Unit"
              value={filters.unit}
              onChange={(event) => setFilters((f) => ({ ...f, unit: event.target.value }))}
              options={[{ value: '', label: 'Portions or kilograms' }, ...toOptions(UNITS)]}
            />
            <Input
              label="City contains"
              value={filters.city}
              onChange={(event) => setFilters((f) => ({ ...f, city: event.target.value }))}
              placeholder="e.g. Bengaluru"
            />
            <Input
              label="Minimum quantity"
              type="number"
              min="0"
              value={filters.minQuantity}
              onChange={(event) => setFilters((f) => ({ ...f, minQuantity: event.target.value }))}
            />
            <Select
              label="Sort by"
              value={filters.sort}
              onChange={(event) => setFilters((f) => ({ ...f, sort: event.target.value }))}
              options={[
                { value: 'deadline', label: 'Closing soonest' },
                { value: 'newest', label: 'Newest first' },
              ]}
            />
            <label className="checkbox-row span-2" htmlFor="selfPickupOnly">
              <input
                id="selfPickupOnly"
                type="checkbox"
                checked={filters.selfPickupOnly}
                onChange={(event) => setFilters((f) => ({ ...f, selfPickupOnly: event.target.checked }))}
              />
              <span>
                <span className="strong small" style={{ display: 'block' }}>
                  Only listings we can collect ourselves
                </span>
                <span className="tiny muted">Excludes listings that require a partner or volunteer collection.</span>
              </span>
            </label>
          </div>

          <div className="row-wrap mt-4">
            <Button type="submit" variant="primary" icon={Filter}>
              Apply filters
            </Button>
            <Button type="button" variant="secondary" icon={SlidersHorizontal} onClick={clearFilters}>
              Clear
            </Button>
            {activeFilterCount ? (
              <span className="small muted">
                {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
              </span>
            ) : null}
          </div>
        </form>
      </Card>

      {error ? (
        <div className="mt-4">
          <Alert variant="danger" title="Listings could not be loaded">
            {error.message}
          </Alert>
        </div>
      ) : null}

      <div className="spread mt-5">
        <strong className="small">
          {data?.pagination?.total ?? 0} open listing{data?.pagination?.total === 1 ? '' : 's'}
        </strong>
        <Button variant="ghost" size="sm" onClick={reload}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="mt-4">
          <LoadingBlock label="Searching open listings…" />
        </div>
      ) : view === 'map' ? (
        <div className="mt-4">
          <MapView
            points={mapPoints}
            height={480}
            emptyMessage="No listings with coordinates matched your filters. Try clearing the city filter or widening the search."
          />
          <p className="tiny muted mt-3">
            Distances shown in listing cards are straight-line estimates, not driving distances.
          </p>
        </div>
      ) : data?.items?.length ? (
        <>
          <div className="grid grid-3 mt-4">
            {data.items.map((donation) => (
              <Card key={idOf(donation)} className="card-hover">
                <div className="card-body stack">
                  <div className="spread">
                    <StatusBadge status={donation.status} />
                    <Badge variant="info">{humanize(donation.foodCategory)}</Badge>
                  </div>

                  <div>
                    <Link to={`/donations/${idOf(donation)}`} className="strong" style={{ fontSize: 'var(--text-lg)' }}>
                      {donation.title}
                    </Link>
                    <p className="tiny muted mt-2">
                      {donation.donor?.name}
                      {donation.distanceKm !== undefined ? ` · ${donation.distanceKm} km away` : ''}
                    </p>
                  </div>

                  <AllocationMeter
                    quantity={donation.quantity}
                    available={donation.availableQuantity}
                    reserved={donation.reservedQuantity}
                    collected={donation.collectedQuantity}
                    label={`${formatQuantity(donation.remainingQuantity, donation.unit)} available`}
                  />

                  <div className="stack-sm small muted">
                    <span>
                      {humanize(donation.dietaryClassification)} · {humanize(donation.storageRequirement)}
                    </span>
                    <span>
                      Collect by {formatDate(donation.collectionDeadline, { withTime: true })}
                    </span>
                    {(donation.allergens || []).length ? (
                      <span className="tiny">
                        Contains: {(donation.allergens || []).map((a) => (typeof a === 'string' ? a : a.name)).join(', ')}
                      </span>
                    ) : (
                      <span className="tiny">No allergens declared</span>
                    )}
                  </div>

                  <LinkButton to={`/donations/${idOf(donation)}`} variant="primary" className="btn-block">
                    View and reserve
                  </LinkButton>
                </div>
              </Card>
            ))}
          </div>

          {data.pagination ? (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={data.pagination.limit}
              onPageChange={setPage}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={Search}
          title="No listings match your filters"
          description="Open listings appear here as verified donors publish them. Try clearing filters, or post a demand request so donors can find you."
          action={
            <div className="row">
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
              <LinkButton to="/demand-requests" variant="primary">
                Post a demand request
              </LinkButton>
            </div>
          }
        />
      )}
    </div>
  );
}

export default MarketplacePage;
