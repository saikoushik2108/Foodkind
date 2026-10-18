import { useState } from 'react';
import { Building2, CheckCircle2, FileText, PauseCircle, XCircle } from 'lucide-react';
import { adminApi } from '../../api/resources.js';
import { useApi, usePagination } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  formatDate,
  humanize,
} from '../../components/ui.jsx';

const idOf = (record) => record?.id || record?._id;

/** Verification queue: the gate that keeps unverified organizations out. */
export function VerificationQueuePage() {
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 10 });
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState(null);

  const pending = useApi(() => (tab === 'pending' ? adminApi.pendingOrganizations({ page: pagination.page, limit: pagination.limit }) : Promise.resolve(null)), [
    tab,
    pagination.page,
    pagination.limit,
  ]);

  const all = useApi(
    () =>
      tab === 'pending'
        ? Promise.resolve(null)
        : adminApi.organizations({ page: pagination.page, limit: pagination.limit, status: tab === 'all' ? undefined : tab }),
    [tab, pagination.page, pagination.limit]
  );

  // `/admin/organizations/pending` returns a bare array; the filtered listing
  // is paginated. Normalise both here so the table stays simple.
  const source = tab === 'pending' ? pending : all;
  const rows = Array.isArray(source.data) ? source.data : source.data?.items || [];

  function reloadAll() {
    pending.reload();
    all.reload();
  }

  async function applyDecision(action) {
    if (!decision) return;
    const organisationId = idOf(decision.organization);
    setBusy(true);
    try {
      if (action === 'approve') {
        await adminApi.approveOrganization(organisationId, reason || 'Documents verified');
        toast.success(`${decision.organization.name} approved.`);
      } else if (action === 'reject') {
        await adminApi.rejectOrganization(organisationId, reason);
        toast.info(`${decision.organization.name} rejected; the organization has been notified.`);
      } else {
        await adminApi.suspendOrganization(organisationId, reason);
        toast.warning(`${decision.organization.name} suspended.`);
      }
      setDecision(null);
      setReason('');
      reloadAll();
    } catch (error) {
      toast.error(error.message, { title: 'The decision could not be recorded' });
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'organization',
      header: 'Organization',
      render: (row) => (
        <div>
          <strong>{row.organization?.name || row.name}</strong>
          <div className="tiny muted">
            {humanize(row.organization?.type || row.type)} · {row.organization?.city || row.city}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <div className="small">
          {(row.organization || row).contactEmail || '—'}
          <div className="tiny muted">{(row.organization || row).contactPhone || ''}</div>
        </div>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (row) => (
        <span className="small muted">
          {formatDate((row.organization || row).verification?.submittedAt || row.createdAt, { withTime: true })}
        </span>
      ),
    },
    {
      key: 'documents',
      header: 'Documents',
      render: (row) => {
        const count = ((row.organization || row).documents || []).length;
        return (
          <span className="small">
            <FileText size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> {count}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={(row.organization || row).verificationStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const org = row.organization || row;
        const status = org.verificationStatus;
        return (
          <div className="table-actions">
            <Button size="sm" variant="ghost" onClick={() => setDetail(row)}>
              Review
            </Button>
            {status !== 'APPROVED' ? (
              <Button
                size="sm"
                variant="primary"
                icon={CheckCircle2}
                onClick={() => {
                  setDecision({ organization: org, action: 'approve' });
                  setReason('Documents verified');
                }}
              >
                Approve
              </Button>
            ) : null}
            {status === 'PENDING' ? (
              <Button
                size="sm"
                variant="danger"
                icon={XCircle}
                onClick={() => {
                  setDecision({ organization: org, action: 'reject' });
                  setReason('');
                }}
              >
                Reject
              </Button>
            ) : null}
            {status === 'APPROVED' ? (
              <Button
                size="sm"
                variant="outline-danger"
                icon={PauseCircle}
                onClick={() => {
                  setDecision({ organization: org, action: 'suspend' });
                  setReason('');
                }}
              >
                Suspend
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Organization verification"
        subtitle="No organization can publish or claim food until it is approved here. Review the details and any uploaded documents before deciding."
      />

      <Card>
        <CardHeader
          title={`${source.data?.pagination?.total ?? 0} organization${source.data?.pagination?.total === 1 ? '' : 's'}`}
          subtitle={tab === 'pending' ? 'Awaiting a verification decision.' : 'Filtered by verification status.'}
          action={
            <Select
              label="Status"
              value={tab}
              onChange={(event) => {
                setTab(event.target.value);
                setPage(1);
              }}
              options={[
                { value: 'pending', label: 'Awaiting verification' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'all', label: 'All organizations' },
              ]}
            />
          }
        />

        {source.loading ? (
          <div className="card-body">
            <div className="skeleton skeleton-block" />
          </div>
        ) : rows.length ? (
          <>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable columns={columns} rows={rows} caption="Organizations for verification" />
            </div>
            {source.data?.pagination ? (
              <div className="card-body">
                <Pagination
                  page={source.data.pagination.page}
                  totalPages={source.data.pagination.totalPages || 1}
                  total={source.data.pagination.total}
                  limit={pagination.limit}
                  onPageChange={setPage}
                />
              </div>
            ) : (
              <div className="card-body">
                <p className="tiny muted">
                  Showing all {rows.length} organizations awaiting verification. Decide on each one to clear the queue.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="card-body">
            <EmptyState
              icon={Building2}
              title={tab === 'pending' ? 'Nothing waiting for verification' : 'No organizations with this status'}
              description={
                tab === 'pending'
                  ? 'New partner registrations will appear here with their details and uploaded documents.'
                  : 'Try a different status filter.'
              }
            />
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Organization review"
        size="lg"
      >
        {detail ? (
          <div className="stack">
            <div className="spread">
              <strong>{detail.organization?.name || detail.name}</strong>
              <StatusBadge status={detail.organization?.verificationStatus || detail.verificationStatus} />
            </div>

            <dl className="detail-list">
              <div>
                <dt>Type</dt>
                <dd>{humanize(detail.organization?.type || detail.type)}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{detail.organization?.city || detail.city}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{detail.organization?.addressLine || detail.addressLine}</dd>
              </div>
              <div>
                <dt>Contact email</dt>
                <dd>{detail.organization?.contactEmail || detail.contactEmail}</dd>
              </div>
              <div>
                <dt>Contact phone</dt>
                <dd>{detail.organization?.contactPhone || detail.contactPhone || '—'}</dd>
              </div>
              <div>
                <dt>Service area</dt>
                <dd>{detail.organization?.serviceAreaKm ?? detail.serviceAreaKm ?? '—'} km</dd>
              </div>
              <div>
                <dt>Documents submitted</dt>
                <dd>{((detail.organization || detail).documents || []).length}</dd>
              </div>
              <div>
                <dt>Previous decision</dt>
                <dd>{(detail.organization || detail).verification?.reason || '—'}</dd>
              </div>
            </dl>

            {(detail.organization || detail).description ? (
              <p className="small muted">{(detail.organization || detail).description}</p>
            ) : null}

            {((detail.organization || detail).documents || []).length ? (
              <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
                {((detail.organization || detail).documents || []).map((doc, index) => (
                  <li key={index} className="row small">
                    <FileText size={15} aria-hidden="true" />
                    <span>{doc.label || doc.originalName || 'Document'}</span>
                    <span className="tiny muted">{doc.originalName}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert variant="info" title="No documents uploaded">
                You can still decide based on the submitted details. Requests for documents should be recorded in the
                rejection reason so the organization knows what to fix.
              </Alert>
            )}

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={
          decision?.action === 'approve'
            ? 'Approve this organization?'
            : decision?.action === 'reject'
              ? 'Reject this organization?'
              : 'Suspend this organization?'
        }
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDecision(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={decision?.action === 'approve' ? 'primary' : 'danger'}
              loading={busy}
              onClick={() => applyDecision(decision?.action)}
            >
              {decision?.action === 'approve' ? 'Approve' : decision?.action === 'reject' ? 'Reject' : 'Suspend'}
            </Button>
          </div>
        }
      >
        <div className="stack-sm">
          <p className="small">
            <strong>{decision?.organization?.name}</strong>
            {decision?.action === 'approve'
              ? ' will be able to publish surplus or claim food immediately.'
              : decision?.action === 'reject'
                ? ' will be notified with your reason and may resubmit after fixing the issues.'
                : ' will lose the ability to publish or claim food until reinstated.'}
          </p>
          <Textarea
            label={decision?.action === 'approve' ? 'Note (optional)' : 'Reason (required)'}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint="This is recorded in the audit log and shown to the organization."
          />
          {decision?.action !== 'approve' && reason.trim().length < 3 ? (
            <span className="field-error">A reason of at least three characters is required.</span>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

export default VerificationQueuePage;
