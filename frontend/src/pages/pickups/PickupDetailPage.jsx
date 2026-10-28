import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, MapPin, PackageCheck, ShieldAlert, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { pickupApi } from '../../api/resources.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DetailList,
  LinkButton,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  formatDate,
  formatQuantity,
  humanize,
} from '../../components/ui.jsx';
import { MapView } from '../../components/MapView.jsx';
import { INCIDENT_TYPES } from '../../constants/domain.js';

const idOf = (record) => {
  if (!record) return null;
  if (typeof record === 'string') return record;
  return record.id || record._id || null;
};

const STAGES = ['ASSIGNED', 'ARRIVED', 'COLLECTED', 'DELIVERED', 'COMPLETED'];

/** One pickup task: the handover workflow in order, with the guardrails visible. */
export function PickupDetailPage() {
  const { id } = useParams();
  const { user, organization, isAdmin, isDonor, isVolunteer, isAgent, isPartner, isRecipient } = useAuth();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ receivedQuantity: '', note: '' });
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ reason: '', type: 'MISSED_PICKUP', quantityAffected: '' });

  const { data, error, loading, reload } = useApi(() => pickupApi.get(id), [id]);
  const task = data?.items && !data?._id ? (Array.isArray(data.items) ? data.items[0] : data.items) : data;
  const meta = task?.meta || data?.meta;

  if (loading) {
    return (
      <div className="page">
        <LoadingBlock label="Loading pickup task…" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="page">
        <Alert variant="danger" title="This pickup is not available">
          {error?.message || 'You may not be a participant in this collection.'}
        </Alert>
        <div className="mt-4">
          <LinkButton to="/pickups" variant="secondary" icon={ArrowLeft}>
            Back to pickups
          </LinkButton>
        </div>
      </div>
    );
  }

  const orgId = idOf(organization);
  const assignedToMe = Boolean(idOf(task.assignedTo) && idOf(user) && idOf(task.assignedTo) === idOf(user));
  const isDonorSide = Boolean((orgId && idOf(task.donor) === orgId) || (isDonor && !isVolunteer && !isAgent) || isAdmin);
  const isRecipientSide = Boolean((orgId && idOf(task.recipient) === orgId) || (isRecipient && !isVolunteer && !isAgent) || isAdmin);
  const isUnassigned = !task.assignedTo || !idOf(task.assignedTo) || task.status === 'PENDING_ACCEPTANCE';
  const canAccept = (isVolunteer || isAgent || isPartner || isAdmin) && isUnassigned && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status);
  const isCollectorSide = Boolean(assignedToMe || isVolunteer || isAgent || isPartner || isAdmin);
  const currentStage = Math.max(0, STAGES.indexOf(task.status));

  async function run(action, successMessage, failureTitle) {
    setBusy(true);
    try {
      const result = await action();
      toast.success(successMessage);
      setCode('');
      reload();
      return result;
    } catch (err) {
      toast.error(err.message, { title: failureTitle });
      return null;
    } finally {
      setBusy(false);
    }
  }

  const points = [];
  if (task.donation?.collectionLocation) {
    points.push({
      position: task.donation.collectionLocation,
      label: 'Collection',
      description: task.pickupAddress,
      color: '#16a34a',
    });
  }
  if (task.recipient?.location) {
    points.push({
      position: task.recipient.location,
      label: 'Delivery',
      description: task.deliveryAddress,
      color: '#14532d',
    });
  }

  return (
    <div className="page">
      <PageHeader
        title={task.donation?.title || 'Pickup task'}
        subtitle={`${task.donor?.name || 'Donor'} → ${task.recipient?.name || 'Recipient'}`}
        actions={
          <>
            <LinkButton to="/pickups" variant="ghost" size="sm" icon={ArrowLeft}>
              Back
            </LinkButton>
            {task.donation ? (
              <LinkButton to={`/donations/${idOf(task.donation)}`} variant="secondary" size="sm">
                Open listing
              </LinkButton>
            ) : null}
          </>
        }
      />

      <div className="row-wrap" style={{ marginBottom: 'var(--space-5)' }}>
        <StatusBadge status={task.status === 'PENDING_ACCEPTANCE' ? 'PENDING' : task.status} />
        <Badge variant={isUnassigned ? 'warning' : 'neutral'}>
          {isUnassigned ? 'Available Mission (Unassigned)' : humanize(task.assignmentType)}
        </Badge>
        {task.status === 'ARRIVED' ? <Badge variant="success">Handover code active</Badge> : null}
        <Badge variant="info">{meta?.distanceType === 'straight-line' ? 'Straight-line distance' : 'Distance'}</Badge>
      </div>

      <Card className="mb-5" style={{ marginBottom: 'var(--space-5)' }}>
        <CardHeader title="Collection progress" subtitle="Each step is attributed and recorded in the audit trail." />
        <div className="card-body">
          <ol className="timeline">
            {STAGES.map((stage, index) => {
              const event = (task.eventHistory || []).find((entry) => entry.event?.includes(stage));
              return (
                <li className="timeline-item" key={stage}>
                  <span
                    className={`timeline-dot ${
                      index < currentStage ? 'timeline-dot-done' : index === currentStage ? 'timeline-dot-current' : ''
                    }`}
                  />
                  <div>
                    <div className="small strong">{humanize(stage)}</div>
                    <div className="tiny muted">
                      {stage === 'ASSIGNED' && isUnassigned
                        ? 'Awaiting volunteer acceptance'
                        : event
                          ? formatDate(event.at, { withTime: true })
                          : index <= currentStage
                            ? 'In progress'
                            : 'Not reached yet'}
                      {event?.note ? ` · ${event.note}` : ''}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {task.delayMinutes ? (
            <Alert variant="warning" title={`Arrived ${task.delayMinutes} minutes after the window opened`}>
              The delay is recorded and shared with the recipient organization.
            </Alert>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-sidebar">
        <div className="stack">
          <Card>
            <CardHeader title="Task details" />
            <div className="card-body">
              <DetailList
                items={[
                  { label: 'Pickup window', value: `${formatDate(task.windowStart, { withTime: true })} → ${formatDate(task.windowEnd, { withTime: true })}` },
                  { label: 'Expected quantity', value: formatQuantity(task.expectedQuantity, task.unit) },
                  { label: 'Collected', value: task.collectedQuantity ? formatQuantity(task.collectedQuantity, task.unit) : '—' },
                  { label: 'Delivered (confirmed)', value: task.deliveredQuantity ? formatQuantity(task.deliveredQuantity, task.unit) : '—' },
                  { label: 'Assigned to', value: task.assignedTo?.name || 'Unassigned' },
                  { label: 'Partner organization', value: task.assignedPartner?.name || '—' },
                  { label: 'Pickup address', value: task.pickupAddress },
                  { label: 'Delivery address', value: task.deliveryAddress },
                  { label: 'Pickup instructions', value: task.pickupInstructions },
                  { label: 'Delivery instructions', value: task.deliveryInstructions },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Route" subtitle="Straight-line view of collection and delivery points." />
            <div className="card-body">
              <MapView
                points={points}
                height={300}
                connect={points.length > 1}
                emptyMessage="Coordinates are not available for this task yet. Addresses are listed above."
              />
              <p className="small muted mt-3">
                <MapPin size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                {task.pickupAddress} → {task.deliveryAddress}
              </p>
            </div>
          </Card>

          {task.eventHistory?.length ? (
            <Card>
              <CardHeader title="Event history" />
              <div className="card-body">
                <ul className="timeline">
                  {task.eventHistory.map((event, index) => (
                    <li className="timeline-item" key={index}>
                      <span className={`timeline-dot ${index === task.eventHistory.length - 1 ? 'timeline-dot-current' : 'timeline-dot-done'}`} />
                      <div>
                        <div className="small strong">{humanize(event.event)}</div>
                        <div className="tiny muted">
                          {formatDate(event.at, { withTime: true })}
                          {event.note ? ` · ${event.note}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="stack">
          <Card>
            <CardHeader title="Actions" subtitle="Only the next valid step is offered." />
            <div className="card-body stack-sm">

              {/* 1. Accept or Decline Pickup (Volunteers / Partners) */}
              {canAccept ? (
                <div
                  className="card card-pad stack-sm"
                  style={{
                    background: 'var(--green-tint)',
                    border: '1.5px solid var(--green)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div className="spread">
                    <span className="small strong" style={{ color: 'var(--forest)' }}>
                      Available Rescue Mission
                    </span>
                    <Badge variant="success">Open for Pickup</Badge>
                  </div>
                  <p className="small muted">
                    Would you like to accept this food rescue mission? Once accepted, you will be assigned as the collector to pick up the food from the donor.
                  </p>
                  <div className="row" style={{ gap: 'var(--space-2)' }}>
                    <Button
                      variant="primary"
                      icon={CheckCircle2}
                      loading={busy}
                      onClick={() =>
                        run(() => pickupApi.accept(id), 'Pickup accepted! You are now the assigned collector.', 'Could not accept pickup')
                      }
                    >
                      Accept pickup
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        run(() => pickupApi.decline(id), 'Pickup declined.', 'Could not decline pickup')
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* 2. Confirm Arrival (Assigned Volunteer or Donor) */}
              {(task.status === 'ASSIGNED' || (task.status === 'PENDING_ACCEPTANCE' && !isUnassigned)) ? (
                <div className="stack-sm">
                  {isCollectorSide ? (
                    <>
                      <p className="small muted">
                        Reaching the donor&apos;s premises? Click Confirm arrival to generate the 6-digit handover code on the donor&apos;s screen.
                      </p>
                      <Button
                        variant="primary"
                        icon={Truck}
                        loading={busy}
                        onClick={() =>
                          run(
                            () => pickupApi.confirmArrival(id),
                            'Arrival confirmed! The 6-digit handover code is now active on the donor’s screen.',
                            'Could not confirm arrival'
                          )
                        }
                      >
                        Confirm arrival
                      </Button>
                    </>
                  ) : isDonorSide ? (
                    <>
                      <p className="small muted">
                        The collector is en route. When the collector arrives at your facility, click below to generate your 6-digit handover code.
                      </p>
                      <Button
                        variant="primary"
                        icon={CheckCircle2}
                        loading={busy}
                        onClick={() =>
                          run(
                            () => pickupApi.confirmArrival(id),
                            'Arrival confirmed! Your 6-digit handover code is displayed below.',
                            'Could not confirm arrival'
                          )
                        }
                      >
                        Confirm collector arrived
                      </Button>
                    </>
                  ) : (
                    <Alert variant="info" title="Collector En Route">
                      The assigned collector is travelling to the donor premises.
                    </Alert>
                  )}
                </div>
              ) : null}

              {/* 3. ARRIVED State: Donor Code Display & Volunteer Code Input */}
              {task.status === 'ARRIVED' ? (
                <div className="stack-sm">
                  {/* PROMINENT HANDOVER CODE FOR DONOR */}
                  {isDonorSide ? (
                    <div
                      className="card card-pad stack-sm"
                      style={{
                        background: '#f0fdf4',
                        border: '2px solid #16a34a',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      <div className="spread">
                        <span className="small strong" style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <KeyRound size={16} /> Handover Verification Code
                        </span>
                        <Badge variant="success">Collector Arrived</Badge>
                      </div>
                      <p className="small" style={{ color: '#14532d', margin: '4px 0' }}>
                        The collector has arrived! Please inspect the food packages and read this 6-digit code to the collector:
                      </p>
                      <div
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 800,
                          letterSpacing: '0.25em',
                          textAlign: 'center',
                          padding: '0.75rem',
                          background: '#ffffff',
                          borderRadius: '10px',
                          border: '2px dashed #16a34a',
                          color: '#15803d',
                          fontFamily: 'monospace',
                          margin: '0.5rem 0',
                        }}
                      >
                        {task.handoverCode || '------'}
                      </div>
                      <p className="tiny muted text-center">
                        The collector must enter this code in their dashboard to confirm pickup handover.
                      </p>
                    </div>
                  ) : null}

                  {/* CODE ENTRY FORM FOR VOLUNTEER / COLLECTOR */}
                  {isCollectorSide ? (
                    <div className="stack-sm mt-2">
                      <Alert variant="info" title="Enter the donor's 6-digit handover code">
                        Ask the donor for the 6-digit code displayed on their screen, then enter it here to accept the food handover.
                      </Alert>
                      <label className="field">
                        <span className="field-label">Six-digit handover code</span>
                        <input
                          className="input mono"
                          inputMode="numeric"
                          pattern="\d{6}"
                          maxLength={6}
                          value={code}
                          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          aria-label="Six-digit handover code"
                          style={{ fontSize: '1.4rem', letterSpacing: '0.25em', textAlign: 'center' }}
                        />
                      </label>
                      <Button
                        variant="primary"
                        icon={KeyRound}
                        loading={busy}
                        disabled={code.length !== 6}
                        onClick={() =>
                          run(
                            () => pickupApi.verifyPickup(id, code),
                            'Handover verified! Food pickup accepted and recorded as in transit.',
                            'Verification failed'
                          )
                        }
                      >
                        Verify and collect food
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* 4. COLLECTED State: Reaching Drop Location & Marking Delivered */}
              {task.status === 'COLLECTED' ? (
                <div className="stack-sm">
                  <Alert variant="info" title="Food is in transit to destination">
                    Heading to recipient kitchen at: <strong>{task.deliveryAddress}</strong>.
                    When you reach the drop location, click <strong>Delivered</strong> below to complete the flow.
                  </Alert>
                  <Button
                    variant="primary"
                    icon={PackageCheck}
                    loading={busy}
                    onClick={() =>
                      run(
                        () => pickupApi.confirmDelivery(id, { receivedQuantity: task.collectedQuantity || task.quantity }),
                        'Mission complete! The food has been delivered and recorded.',
                        'Could not record delivery'
                      )
                    }
                  >
                    Delivered
                  </Button>
                </div>
              ) : null}

              {/* 5. DELIVERED / COMPLETED State */}
              {['DELIVERED', 'COMPLETED'].includes(task.status) ? (
                <Alert variant="success" title="This rescue mission is complete!">
                  <div className="stack-sm">
                    <span>
                      {formatQuantity(task.deliveredQuantity || task.collectedQuantity, task.unit)} confirmed received at {task.recipient?.name || 'recipient'}.
                    </span>
                    <span className="tiny muted">Impact metrics have been updated for all organizations in the chain.</span>
                  </div>
                </Alert>
              ) : null}

              {/* 6. FAILED / CANCELLED State */}
              {['FAILED', 'CANCELLED'].includes(task.status) ? (
                <Alert variant="danger" title={`This task is ${task.status.toLowerCase()}`}>
                  {task.failure?.reason ? `Reason: ${task.failure.reason}` : 'No completion was recorded.'}
                </Alert>
              ) : null}

              {/* 7. Problem Reporting */}
              {!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(task.status) ? (
                <div className="mt-2">
                  <Button variant="outline-danger" icon={ShieldAlert} onClick={() => setIssueOpen(true)} disabled={busy} className="btn-block">
                    Report a problem
                  </Button>
                </div>
              ) : null}

              {assignedToMe ? <p className="tiny muted">You are the assigned collector for this mission.</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Participants" />
            <div className="card-body">
              <DetailList
                items={[
                  { label: 'Donor', value: task.donor?.name || '—' },
                  { label: 'Recipient', value: task.recipient?.name || '—' },
                  { label: 'Collector', value: task.assignedTo?.name || 'Unassigned' },
                  { label: 'Collector role', value: task.assignedTo?.role ? humanize(task.assignedTo.role) : '—' },
                  { label: 'Donor contact', value: task.donor?.contactPhone || task.donor?.contactEmail || '—' },
                  { label: 'Recipient contact', value: task.recipient?.contactPhone || task.recipient?.contactEmail || '—' },
                ]}
              />
              {task.donation ? (
                <div className="mt-4">
                  <Link to={`/donations/${idOf(task.donation)}`} className="small">
                    View the donation record
                  </Link>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={deliveryOpen}
        onClose={() => setDeliveryOpen(false)}
        title="Confirm delivery received"
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDeliveryOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={CheckCircle2}
              loading={busy}
              onClick={async () => {
                const ok = await run(
                  () =>
                    pickupApi.confirmDelivery(id, {
                      receivedQuantity: Number(deliveryForm.receivedQuantity),
                      note: deliveryForm.note,
                    }),
                  'Delivery confirmed.',
                  'Could not confirm delivery'
                );
                if (ok) setDeliveryOpen(false);
              }}
            >
              Confirm received
            </Button>
          </div>
        }
      >
        <div className="stack-sm">
          <label className="field">
            <span className="field-label">
              Quantity received ({humanize(task.unit).toLowerCase()}) *
            </span>
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              value={deliveryForm.receivedQuantity}
              onChange={(event) => setDeliveryForm((f) => ({ ...f, receivedQuantity: event.target.value }))}
            />
            <span className="field-hint">
              Collected {formatQuantity(task.collectedQuantity, task.unit)}. Only this number counts as redistributed.
            </span>
          </label>
          <Textarea
            label="Note (optional)"
            rows={2}
            value={deliveryForm.note}
            onChange={(event) => setDeliveryForm((f) => ({ ...f, note: event.target.value }))}
            hint="Anything the donor should know — condition, packaging, temperature on arrival."
          />
          {Number(deliveryForm.receivedQuantity) < Number(task.collectedQuantity) ? (
            <Alert variant="warning" title="This records a shortfall">
              The difference will not be counted as redistributed, and the shortfall is kept on the record.
            </Alert>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Report a pickup problem"
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                const ok = await run(
                  () =>
                    pickupApi.reportIssue(id, {
                      reason: issueForm.reason,
                      type: issueForm.type,
                      quantityAffected: issueForm.quantityAffected ? Number(issueForm.quantityAffected) : null,
                    }),
                  'Problem reported. An incident has been opened.',
                  'Could not report the problem'
                );
                if (ok) setIssueOpen(false);
              }}
            >
              Report problem
            </Button>
          </div>
        }
      >
        <div className="stack">
          <Alert variant="warning" title="This does not complete the pickup">
            Reporting a problem marks the task as failed and opens an incident for review. It never silently marks food
            as delivered.
          </Alert>
          <Select
            label="Problem type"
            value={issueForm.type}
            onChange={(event) => setIssueForm((f) => ({ ...f, type: event.target.value }))}
            options={INCIDENT_TYPES.map((type) => ({ value: type, label: humanize(type) }))}
          />
          <Textarea
            label="What happened? (required)"
            rows={3}
            value={issueForm.reason}
            onChange={(event) => setIssueForm((f) => ({ ...f, reason: event.target.value }))}
          />
          <label className="field">
            <span className="field-label">Quantity affected (optional)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              value={issueForm.quantityAffected}
              onChange={(event) => setIssueForm((f) => ({ ...f, quantityAffected: event.target.value }))}
            />
          </label>
          {issueForm.reason.trim().length < 5 ? (
            <span className="field-error">Please describe the problem in at least five characters.</span>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

export default PickupDetailPage;
