import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Map as MapIcon, MapPin, RefreshCw, Utensils } from 'lucide-react';
import { donationApi } from '../api/resources.js';
import { useApi, usePagination } from '../hooks/useApi.js';
import { useCurrentLocation } from '../hooks/useCurrentLocation.js';
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
  StatusBadge,
  formatDate,
  formatQuantity,
  humanize,
} from '../components/ui.jsx';
import { MapView } from '../components/MapView.jsx';

const idOf = (record) => record?.id || record?._id;

/** Food discovery showing all available surplus listings for recipients and volunteers. */
export function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSort = searchParams.get('sort') || 'distance';

  const { coords, source: geoSource, isDetecting: isDetectingGeo, detectLocation, statusMessage: geoMessage } = useCurrentLocation();
  const { pagination, setPage } = usePagination({ page: 1, limit: 12 });
  const [sort, setSort] = useState(initialSort);
  const [view, setView] = useState('grid');

  const { data, error, loading, reload } = useApi(
    () =>
      donationApi.list({
        page: pagination.page,
        limit: pagination.limit,
        lat: coords?.lat,
        lng: coords?.lng,
        sort,
      }),
    [pagination.page, pagination.limit, sort, coords?.lat, coords?.lng],
    { pollInterval: 6000 }
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

  function handleSortChange(newSort) {
    setSort(newSort);
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sort', newSort);
      return next;
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Find surplus food"
        subtitle="All available surplus food ready for rescue and claim, ordered by proximity to your current location."
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
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--surface-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: geoSource === 'gps' ? 'var(--green-muted)' : 'var(--surface)',
                color: geoSource === 'gps' ? 'var(--green)' : 'var(--primary)',
              }}
            >
              <MapPin size={16} aria-hidden="true" />
            </span>
            <div>
              <span className="small strong">
                Location: {coords?.label || 'Current GPS'}
              </span>
              {coords?.lat ? <span className="tiny muted ml-1">({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</span> : null}
              {geoSource === 'gps' ? (
                <Badge variant="success" style={{ marginLeft: 'var(--space-2)' }}>
                  Live GPS
                </Badge>
              ) : (
                <Badge variant="neutral" style={{ marginLeft: 'var(--space-2)' }}>
                  Base Station
                </Badge>
              )}
              {geoMessage ? <div className="tiny muted">{geoMessage}</div> : null}
            </div>
          </div>

          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <span className="tiny muted strong" style={{ whiteSpace: 'nowrap' }}>Sort by:</span>
              <select
                className="input small"
                style={{ width: 'auto', padding: '4px 10px', height: 32 }}
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                aria-label="Sort options"
              >
                <option value="distance">Nearest to my location</option>
                <option value="deadline">Closing soonest</option>
                <option value="newest">Newest first</option>
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              loading={isDetectingGeo}
              onClick={detectLocation}
            >
              Detect GPS
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="mt-4">
          <Alert variant="danger" title="Listings could not be loaded">
            {error.message}
          </Alert>
        </div>
      ) : null}

      <div className="spread mt-4">
        <strong className="small">
          {data?.pagination?.total ?? 0} available surplus listing{data?.pagination?.total === 1 ? '' : 's'}
        </strong>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={reload}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="mt-4">
          <LoadingBlock label="Loading available surplus listings…" />
        </div>
      ) : view === 'map' ? (
        <div className="mt-4">
          <MapView
            points={mapPoints}
            height={480}
            emptyMessage="No available listings with coordinates found."
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
                    <div className="row" style={{ gap: 'var(--space-2)' }}>
                      <StatusBadge status={donation.status} />
                      {donation.distanceKm != null ? (
                        <Badge
                          variant={donation.distanceKm <= 3 ? 'success' : donation.distanceKm <= 10 ? 'info' : 'neutral'}
                          icon={MapPin}
                        >
                          {donation.formattedDistance || `${donation.distanceKm} km away`}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="tiny muted">{humanize(donation.foodCategory)}</span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>
                    <Link to={`/donations/${idOf(donation)}`}>{donation.title}</Link>
                  </h3>

                  <div className="small muted">
                    {donation.donor?.name || 'Verified donor'}
                    {donation.donor?.city ? ` · ${donation.donor.city}` : ''}
                  </div>

                  <AllocationMeter
                    total={donation.quantity}
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
          icon={Utensils}
          title="No surplus food available right now"
          description="Open listings appear here as soon as verified donors publish surplus food in the network."
          action={
            <Button variant="primary" icon={RefreshCw} onClick={reload}>
              Refresh listings
            </Button>
          }
        />
      )}
    </div>
  );
}

export default MarketplacePage;
