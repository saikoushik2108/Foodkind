import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  MapPin,
  Package,
  Rocket,
  Sparkles,
  Thermometer,
  Truck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { donationApi, pickupApi, reservationApi } from '../../api/resources.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Alert,
  AllocationMeter,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DetailList,
  EmptyState,
  LinkButton,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  formatDate,
  formatQuantity,
  formatRelative,
  humanize,
} from '../../components/ui.jsx';
import { MapView } from '../../components/MapView.jsx';
import { PICKUP_ASSIGNMENT_TYPES } from '../../constants/domain.js';

const idOf = (record) => record?.id || record?._id;

/** Full record of one donation, with the actions available to the viewer. */
export function DonationDetailPage() {
  const { id } = useParams();
  const { isDonor, isAdmin, user, organization } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actualOpen, setActualOpen] = useState(false);
  const [actualQuantity, setActualQuantity] = useState('');
  const [pickupFor, setPickupFor] = useState(null);
  const [pickupForm, setPickupForm] = useState({ assignmentType: 'PARTNER', assignedTo: '' });
  const [busy, setBusy] = useState(false);

  const { data: donation, error, loading, reload } = useApi(() => donationApi.get(id), [id]);
  const matches = useApi(
    () => (donation?.isOwner || isAdmin ? donationApi.matches(id, { limit: 10 }) : Promise.resolve(null)),
    [id, donation?.isOwner, isAdmin]
  );
  const reservations = useApi(
    () => (donation ? reservationApi.mine({ donationId: id, limit: 50 }) : Promise.resolve(null)),
    [id, donation]
  );

  if (loading) {
    return (
      <div className="page">
        <LoadingBlock label="Loading listing…" />
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="page">
        <Alert variant="danger" title="This listing is not available">
          {error?.message || 'It may have been withdrawn, expired, or you may not have access to it.'}
        </Alert>
        <div className="mt-4">
          <LinkButton to="/marketplace" variant="secondary" icon={ArrowLeft}>
            Back to the marketplace
          </LinkButton>
        </div>
      </div>
    );
  }

  const isOwner = Boolean(donation.isOwner);
  const canActAsDonor = isOwner || isAdmin;
  const deadlinePassed = new Date(donation.collectionDeadline) < new Date();
  const canCancel = !['CANCELLED', 'COMPLETED', 'COLLECTED', 'DELIVERED', 'EXPIRED'].includes(donation.status);
  const canEdit = canActAsDonor && ['DRAFT', 'AVAILABLE'].includes(donation.status) && donation.reservedQuantity === 0;

  // Recipient-side reservations for this donation, filtered to the caller's org.
  const myReservation = (reservations.data?.items || []).find(
    (r) => idOf(r.donation) === id || idOf(r.donation?._id) === id
  );

  async function publish() {
    setBusy(true);
    try {
      await donationApi.publish(id);
      toast.success('Listing published.');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not publish' });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await donationApi.cancel(id, cancelReason.trim());
      toast.success('Listing cancelled and holds released.');
      setCancelOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not cancel' });
    } finally {
      setBusy(false);
    }
  }

  async function saveActual() {
    setBusy(true);
    try {
      await donationApi.confirmActual(id, Number(actualQuantity));
      toast.success('Actual surplus recorded. This feeds future forecasts.');
      setActualOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not record the actual quantity' });
    } finally {
      setBusy(false);
    }
  }

  async function reserveFood() {
    setBusy(true);
    try {
      await donationApi.reserve(id, { requestedQuantity: donation.remainingQuantity, message: 'Requested from the listing page' });
      toast.success('Reservation requested. The donor will accept or decline it.');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not reserve' });
    } finally {
      setBusy(false);
    }
  }

  async function arrangePickup() {
    if (!pickupFor) return;
    setBusy(true);
    try {
      await reservationApi.createPickup(idOf(pickupFor), {
        assignmentType: pickupForm.assignmentType,
        assignedTo: pickupForm.assignedTo || null,
      });
      toast.success('Pickup arranged.');
      setPickupFor(null);
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not create the pickup' });
    } finally {
      setBusy(false);
    }
  }

  const collectionPoints = donation.collectionLocation
    ? [
        {
          position: donation.collectionLocation,
          label: donation.donor?.name || 'Collection point',
          description: donation.collectionAddress,
        },
      ]
    : [];

  return (
    <div className="page">
      <PageHeader
        title={donation.title}
        subtitle={`${donation.donor?.name || 'Donor'} · ${donation.collectionAddress}`}
        actions={
          <>
            <LinkButton to={isDonor ? '/donations/mine' : '/marketplace'} variant="ghost" size="sm" icon={ArrowLeft}>
              Back
            </LinkButton>
            {donation.status === 'DRAFT' && canActAsDonor ? (
              <Button variant="primary" icon={Rocket} onClick={publish} loading={busy}>
                Publish
              </Button>
            ) : null}
            {canEdit ? (
              <LinkButton to={`/donations/${id}/edit`} variant="secondary" size="sm">
                Edit listing
              </LinkButton>
            ) : null}
            {canActAsDonor && canCancel ? (
              <Button variant="outline-danger" size="sm" icon={XCircle} onClick={() => setCancelOpen(true)}>
                Cancel listing
              </Button>
            ) : null}
          </>
        }
      />

      <div className="row-wrap" style={{ marginBottom: 'var(--space-5)' }}>
        <StatusBadge status={donation.status} />
        <Badge variant="info">{humanize(donation.foodCategory)}</Badge>
        <Badge variant="neutral">{humanize(donation.dietaryClassification)}</Badge>
        <Badge variant={donation.packagingSealed ? 'success' : 'warning'}>
          {donation.packagingSealed ? 'Sealed packaging' : 'Not sealed'}
        </Badge>
        {deadlinePassed && !['COMPLETED', 'CANCELLED'].includes(donation.status) ? (
          <Badge variant="danger">Collection deadline passed</Badge>
        ) : (
          <Badge variant="warning">Collect by {formatDate(donation.collectionDeadline, { withTime: true })}</Badge>
        )}
      </div>

      {donation.status === 'DRAFT' && canActAsDonor ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Alert variant="info" title="This listing is still a draft">
            Only you can see it. Publish it when the details are correct so eligible recipients can discover it.
          </Alert>
        </div>
      ) : null}

      <div className="grid grid-sidebar">
        <div className="stack">
          <Card>
            <CardHeader title="Allocation" subtitle="Every portion is available, reserved, or collected — never two at once." />
            <div className="card-body stack">
              <AllocationMeter
                quantity={donation.quantity}
                available={donation.availableQuantity}
                reserved={donation.reservedQuantity}
                collected={donation.collectedQuantity}
                label={`${formatQuantity(donation.quantity, donation.unit)} offered`}
              />
              <DetailList
                items={[
                  { label: 'Available', value: formatQuantity(donation.availableQuantity, donation.unit) },
                  { label: 'Reserved', value: formatQuantity(donation.reservedQuantity, donation.unit) },
                  { label: 'Collected', value: formatQuantity(donation.collectedQuantity, donation.unit) },
                  { label: 'Delivered (confirmed)', value: formatQuantity(donation.deliveredQuantity, donation.unit) },
                ]}
              />
              {canActAsDonor ? (
                <Button variant="secondary" size="sm" onClick={() => setActualOpen(true)}>
                  {donation.confirmedActualQuantity === null
                    ? 'Record actual surplus after service'
                    : `Actual surplus recorded: ${formatQuantity(donation.confirmedActualQuantity, donation.unit)}`}
                </Button>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Food details" />
            <div className="card-body">
              <DetailList
                items={[
                  { label: 'Category', value: humanize(donation.foodCategory) },
                  { label: 'Dietary', value: humanize(donation.dietaryClassification) },
                  {
                    label: 'Allergens',
                    value: (donation.allergens || []).length
                      ? (donation.allergens || []).map((a) => (typeof a === 'string' ? a : a.name)).join(', ')
                      : 'None declared',
                  },
                  { label: 'Allergen statement', value: donation.allergenStatement },
                  { label: 'Prepared at', value: formatDate(donation.preparedAt, { withTime: true }) },
                  { label: 'Storage', value: humanize(donation.storageRequirement) },
                  { label: 'Packaging', value: humanize(donation.packagingType) },
                  { label: 'Handling instructions', value: donation.handlingInstructions },
                ]}
              />
              {donation.description ? (
                <p className="small muted mt-4" style={{ whiteSpace: 'pre-wrap' }}>
                  {donation.description}
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recommended recipients"
              subtitle="Ranked by eligibility and fit, with the reasons shown."
              action={
                canActAsDonor ? (
                  <Button size="sm" variant="ghost" icon={Sparkles} onClick={() => matches.reload()}>
                    Re-run
                  </Button>
                ) : null
              }
            />
            <div className="card-body">
              {!canActAsDonor ? (
                <p className="small muted">
                  Match reasoning is visible to the donor organization and platform administrators only.
                </p>
              ) : matches.loading ? (
                <LoadingBlock label="Scoring eligible recipients…" />
              ) : matches.error ? (
                <Alert variant="danger" title="Matching failed">
                  {matches.error.message}
                </Alert>
              ) : matches.data?.notice ? (
                <Alert variant="info">{matches.data.notice}</Alert>
              ) : matches.data?.items?.length ? (
                <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
                  {matches.data.items.map((match) => (
                    <li key={idOf(match.organization)} className="card card-pad" style={{ boxShadow: 'none' }}>
                      <div className="spread">
                        <div>
                          <strong>{match.organization?.name}</strong>
                          <div className="tiny muted">
                            {match.organization?.city} · {match.distanceKm} km away ({match.distanceType})
                          </div>
                        </div>
                        <Badge variant="brand">score {match.matchScore}</Badge>
                      </div>
                      <ul className="stack-sm mt-3 small muted" style={{ paddingLeft: '1.1rem' }}>
                        {(match.reasons || []).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No eligible recipients right now"
                  description="No verified recipient matched the hard eligibility rules — check the service area, the pickup window, and that your category settings allow this food."
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Location" subtitle="Straight-line distance is used for matching; it is not a driving route." />
            <div className="card-body">
              <MapView points={collectionPoints} height={280} />
              <p className="small mt-3">
                <MapPin size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                {donation.collectionAddress}
              </p>
              {donation.pickupInstructions ? (
                <p className="small muted mt-2">
                  <strong>Pickup instructions:</strong> {donation.pickupInstructions}
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHeader title="Collection window" />
            <div className="card-body">
              <DetailList
                items={[
                  {
                    label: 'Pickup window',
                    value: `${formatDate(donation.pickupWindowStart, { withTime: true })} → ${formatDate(donation.pickupWindowEnd, { withTime: true })}`,
                  },
                  { label: 'Collection deadline', value: formatDate(donation.collectionDeadline, { withTime: true }) },
                  { label: 'Arrangement', value: humanize(donation.pickupArrangement) },
                  { label: 'Preferred contact', value: humanize(donation.donorContactMethod) },
                ]}
              />
            </div>
          </Card>

          {!canActAsDonor ? (
            <Card>
              <CardHeader title="Claim this food" />
              <div className="card-body stack">
                {deadlinePassed ? (
                  <Alert variant="warning" title="The collection deadline has passed">
                    This food can no longer be collected safely. Look for other open listings.
                  </Alert>
                ) : donation.remainingQuantity <= 0 ? (
                  <Alert variant="info" title="Fully allocated">
                    Everything on offer has been reserved. Check back in case a reservation is released.
                  </Alert>
                ) : myReservation ? (
                  <Alert variant="info" title="You already have a reservation">
                    <div className="stack-sm">
                      <span>
                        Requested {formatQuantity(myReservation.requestedQuantity || myReservation.approvedQuantity, donation.unit)} ·{' '}
                        <StatusBadge status={myReservation.status} />
                      </span>
                      <Link to="/reservations">Manage this reservation</Link>
                    </div>
                  </Alert>
                ) : (
                  <>
                    <p className="small muted">
                      Reserving asks for the remaining {formatQuantity(donation.remainingQuantity, donation.unit)}. The
                      donor confirms before anything is committed.
                    </p>
                    <Button variant="primary" onClick={reserveFood} loading={busy}>
                      Request this food
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ) : null}

          {canActAsDonor ? (
            <Card>
              <CardHeader title="Reservations" subtitle="Accept to lock food, decline to release it back." />
              <div className="card-body stack-sm">
                {reservations.loading ? (
                  <LoadingBlock label="Loading reservations…" />
                ) : reservations.data?.items?.length ? (
                  reservations.data.items.map((reservation) => (
                    <div key={idOf(reservation)} className="stack-sm" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
                      <div className="spread">
                        <span className="small strong">
                          {formatQuantity(reservation.requestedQuantity, donation.unit)}
                        </span>
                        <StatusBadge status={reservation.status} />
                      </div>
                      <span className="tiny muted">{formatRelative(reservation.createdAt)}</span>
                      <div className="table-actions">
                        {reservation.status === 'RESERVED' ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              loading={busy}
                              onClick={async () => {
                                try {
                                  await reservationApi.accept(idOf(reservation));
                                  toast.success('Reservation accepted.');
                                  reload();
                                } catch (err) {
                                  toast.error(err.message);
                                }
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  await reservationApi.decline(idOf(reservation), 'Declined by the donor');
                                  toast.info('Reservation declined; quantity released.');
                                  reload();
                                } catch (err) {
                                  toast.error(err.message);
                                }
                              }}
                            >
                              Decline
                            </Button>
                          </>
                        ) : null}
                        {['ACCEPTED', 'RESERVED'].includes(reservation.status) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Truck}
                            onClick={() => {
                              setPickupFor(reservation);
                              setPickupForm({ assignmentType: 'PARTNER', assignedTo: '' });
                            }}
                          >
                            Arrange pickup
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="small muted">No reservations yet for this listing.</p>
                )}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Safety record" />
            <div className="card-body stack-sm">
              <div className="row small">
                <ClipboardCheck size={15} aria-hidden="true" style={{ color: 'var(--green-dark)' }} />
                <span>Declarations given by the donor when the listing was created.</span>
              </div>
              <DetailList
                items={[
                  { label: 'Clean facility', value: donation.safetyDeclarations?.preparedInCleanFacility ? 'Declared' : '—' },
                  { label: 'Fit for consumption', value: donation.safetyDeclarations?.fitForHumanConsumption ? 'Declared' : '—' },
                  { label: 'Within safe window', value: donation.safetyDeclarations?.withinSafeWindow ? 'Declared' : '—' },
                  {
                    label: 'Temperature maintained',
                    value: donation.safetyDeclarations?.temperatureMaintained ? 'Declared' : 'Not declared',
                  },
                ]}
              />
              <p className="tiny muted">
                <Thermometer size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> These
                are declarations, not certifications. Always follow your own food-safety procedures.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Listing metadata" />
            <div className="card-body">
              <DetailList
                items={[
                  { label: 'Created', value: formatDate(donation.createdAt, { withTime: true }) },
                  { label: 'Published', value: donation.publishedAt ? formatDate(donation.publishedAt, { withTime: true }) : '—' },
                  { label: 'Listing id', value: <span className="mono tiny">{id}</span> },
                  {
                    label: 'Linked forecast',
                    value: donation.predictionLog ? <span className="mono tiny">{String(donation.predictionLog)}</span> : '—',
                  },
                ]}
              />
              {donation.cancellation?.reason ? (
                <Alert variant="info" title="Cancellation note">
                  {donation.cancellation.reason}
                </Alert>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onConfirm={cancel}
        title="Cancel this listing?"
        confirmLabel="Cancel listing"
        loading={busy}
      >
        <div className="stack-sm">
          <Textarea
            label="Reason (required)"
            rows={2}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          {cancelReason.trim().length < 3 ? (
            <span className="field-error">Please give a reason of at least three characters.</span>
          ) : null}
        </div>
      </ConfirmDialog>

      <Modal
        open={actualOpen}
        onClose={() => setActualOpen(false)}
        title="Record the actual surplus"
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setActualOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveActual} loading={busy}>
              Save
            </Button>
          </div>
        }
      >
        <div className="stack-sm">
          <p className="small muted">
            How much surplus did you actually have? Recording this lets the platform score its own forecasts
            against reality.
          </p>
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            value={actualQuantity}
            onChange={(event) => setActualQuantity(event.target.value)}
            aria-label={`Actual quantity in ${donation.unit}`}
          />
          <span className="tiny muted">
            <Package size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> In{' '}
            {humanize(donation.unit).toLowerCase()}
          </span>
        </div>
      </Modal>

      <Modal
        open={Boolean(pickupFor)}
        onClose={() => setPickupFor(null)}
        title="Arrange a pickup"
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setPickupFor(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={arrangePickup} loading={busy} icon={Truck}>
              Create pickup task
            </Button>
          </div>
        }
      >
        <div className="stack">
          <Alert variant="info" title="Who is collecting?">
            Choose the arrangement that applies. Volunteer and partner collections are assigned to a specific
            person; self-pickup leaves the recipient organization responsible.
          </Alert>
          <Select
            label="Assignment type"
            value={pickupForm.assignmentType}
            onChange={(event) => setPickupForm((form) => ({ ...form, assignmentType: event.target.value }))}
            options={PICKUP_ASSIGNMENT_TYPES.map((type) => ({ value: type, label: humanize(type) }))}
          />
          {pickupForm.assignmentType !== 'RECIPIENT_SELF_PICKUP' ? (
            <div className="field">
              <label className="field-label" htmlFor="assignedTo">
                Assign to user id (optional)
              </label>
              <input
                id="assignedTo"
                className="input"
                value={pickupForm.assignedTo}
                onChange={(event) => setPickupForm((form) => ({ ...form, assignedTo: event.target.value }))}
                placeholder="Leave blank to assign later"
              />
              <span className="field-hint">
                Driver accounts are managed by partner organizations. The task appears in their queue immediately.
              </span>
            </div>
          ) : null}
          <p className="tiny muted">
            <CalendarClock size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> The
            pickup inherits the listing&apos;s window: {formatDate(donation.pickupWindowStart, { withTime: true })} →{' '}
            {formatDate(donation.pickupWindowEnd, { withTime: true })}
          </p>
          <p className="tiny muted">
            Contact preference: {humanize(donation.donorContactMethod)} · {organization?.name || user?.name}
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default DonationDetailPage;
