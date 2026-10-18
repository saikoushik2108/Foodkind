import { useEffect, useState } from 'react';
import { BadgeCheck, Building2, FileUp, RefreshCcw, Save, ShieldAlert } from 'lucide-react';
import { organizationApi } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DetailList,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  formatDate,
  humanize,
} from '../components/ui.jsx';
import { DIETARY_CLASSIFICATIONS, FOOD_CATEGORIES } from '../constants/domain.js';

/** The viewer's organization profile and its verification journey. */
export function OrganizationPage() {
  const { refreshOrganization, organization: sessionOrg } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [documentLabel, setDocumentLabel] = useState('Registration certificate');

  const { data: org, error, loading, reload } = useApi(() => organizationApi.mine(), []);

  const [form, setForm] = useState({
    description: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    addressLine: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    serviceAreaKm: '',
    latitude: '',
    longitude: '',
    dailyPeopleServed: '',
    maxStoragePortions: '',
    canStoreChilled: false,
    preferredCategories: [],
    dietaryCategories: [],
  });

  useEffect(() => {
    if (!org) return;
    setForm({
      description: org.description || '',
      contactEmail: org.contactEmail || '',
      contactPhone: org.contactPhone || '',
      website: org.website || '',
      addressLine: org.addressLine || '',
      city: org.city || '',
      region: org.region || '',
      postalCode: org.postalCode || '',
      country: org.country || '',
      serviceAreaKm: org.serviceAreaKm ?? '',
      latitude: org.location?.coordinates?.[1] ?? '',
      longitude: org.location?.coordinates?.[0] ?? '',
      dailyPeopleServed: org.capacity?.dailyPeopleServed ?? '',
      maxStoragePortions: org.capacity?.maxStoragePortions ?? '',
      canStoreChilled: Boolean(org.capacity?.canStoreChilled),
      preferredCategories: org.preferredCategories || [],
      dietaryCategories: org.dietaryCategories || [],
    });
  }, [org]);

  function toggleList(field, value) {
    setForm((current) => {
      const list = current[field] || [];
      return { ...current, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await organizationApi.updateMine({
        description: form.description,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        website: form.website,
        addressLine: form.addressLine,
        city: form.city,
        region: form.region,
        postalCode: form.postalCode,
        country: form.country,
        serviceAreaKm: form.serviceAreaKm === '' ? undefined : Number(form.serviceAreaKm),
        location:
          form.latitude !== '' && form.longitude !== ''
            ? { type: 'Point', coordinates: [Number(form.longitude), Number(form.latitude)] }
            : undefined,
        capacity: {
          dailyPeopleServed: form.dailyPeopleServed === '' ? undefined : Number(form.dailyPeopleServed),
          maxStoragePortions: form.maxStoragePortions === '' ? undefined : Number(form.maxStoragePortions),
          canStoreChilled: form.canStoreChilled,
        },
        preferredCategories: form.preferredCategories,
        dietaryCategories: form.dietaryCategories,
      });
      toast.success('Organization profile updated.');
      reload();
      refreshOrganization();
    } catch (err) {
      toast.error(err.message, { title: 'Could not save the profile' });
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('label', documentLabel);
      await organizationApi.uploadDocument(formData);
      toast.success('Document uploaded. An administrator can see it in the verification queue.');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Upload failed' });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function resubmit() {
    setResubmitting(true);
    try {
      await organizationApi.resubmit();
      toast.success('Resubmitted for verification.');
      reload();
      refreshOrganization();
    } catch (err) {
      toast.error(err.message, { title: 'Could not resubmit' });
    } finally {
      setResubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <LoadingBlock label="Loading your organization…" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="page">
        <Alert variant="danger" title="Organization profile could not be loaded">
          {error?.message || 'No organization is linked to your account.'}
        </Alert>
      </div>
    );
  }

  const status = org.verificationStatus;
  const documents = org.documents || [];

  return (
    <div className="page">
      <PageHeader
        title={org.name}
        subtitle={`${humanize(org.type)} · ${org.city}${org.region ? `, ${org.region}` : ''}`}
        actions={
          <>
            <StatusBadge status={status} />
            {status === 'REJECTED' ? (
              <Button variant="primary" icon={RefreshCcw} onClick={resubmit} loading={resubmitting}>
                Resubmit for verification
              </Button>
            ) : null}
          </>
        }
      />

      {status === 'PENDING' ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Alert variant="warning" title="Awaiting verification">
            An administrator reviews your organization before it can publish or claim food. Uploading supporting
            documents speeds this up. You can edit your profile in the meantime.
          </Alert>
        </div>
      ) : null}

      {status === 'REJECTED' ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Alert variant="danger" title="Verification was not approved">
            <div className="stack-sm">
              <span>{org.verification?.reason || 'No reason was recorded.'}</span>
              <span className="tiny">
                Address the notes above, upload any missing documents, then resubmit for another review.
              </span>
            </div>
          </Alert>
        </div>
      ) : null}

      {status === 'SUSPENDED' ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Alert variant="danger" title="This organization is suspended">
            {org.verification?.reason || 'Contact a platform administrator for details.'}
          </Alert>
        </div>
      ) : null}

      <div className="grid grid-4">
        <StatCard
          label="Verification"
          value={humanize(status)}
          hint={org.verification?.decidedAt ? `Decided ${formatDate(org.verification.decidedAt)}` : 'Not yet decided'}
          icon={BadgeCheck}
          tone={status === 'APPROVED' ? 'default' : 'warning'}
        />
        <StatCard label="Service area" value={`${org.serviceAreaKm ?? 0} km`} hint="Used for match eligibility" icon={Building2} />
        <StatCard
          label="People served daily"
          value={org.capacity?.dailyPeopleServed ?? 0}
          hint="Declared capacity"
          icon={Building2}
        />
        <StatCard
          label="Storage capacity"
          value={org.capacity?.maxStoragePortions ?? 0}
          hint={org.capacity?.canStoreChilled ? 'Can store chilled food' : 'Chilled storage not available'}
          icon={Building2}
          tone={org.capacity?.canStoreChilled ? 'default' : 'warning'}
        />
      </div>

      <div className="grid grid-sidebar mt-5">
        <Card>
          <CardHeader title="Profile details" subtitle="Accurate details produce better matches and fewer wasted journeys." />
          <form className="card-body form-grid" onSubmit={save}>
            <Input
              label="Contact email"
              type="email"
              className="span-2"
              value={form.contactEmail}
              onChange={(event) => setForm((f) => ({ ...f, contactEmail: event.target.value }))}
            />
            <Input
              label="Contact phone"
              value={form.contactPhone}
              onChange={(event) => setForm((f) => ({ ...f, contactPhone: event.target.value }))}
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(event) => setForm((f) => ({ ...f, website: event.target.value }))}
            />
            <Textarea
              label="Description"
              className="span-2"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />

            <Input
              label="Street address"
              className="span-2"
              value={form.addressLine}
              onChange={(event) => setForm((f) => ({ ...f, addressLine: event.target.value }))}
            />
            <Input label="City" value={form.city} onChange={(event) => setForm((f) => ({ ...f, city: event.target.value }))} />
            <Input label="Region" value={form.region} onChange={(event) => setForm((f) => ({ ...f, region: event.target.value }))} />
            <Input
              label="Postal code"
              value={form.postalCode}
              onChange={(event) => setForm((f) => ({ ...f, postalCode: event.target.value }))}
            />
            <Input label="Country" value={form.country} onChange={(event) => setForm((f) => ({ ...f, country: event.target.value }))} />
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(event) => setForm((f) => ({ ...f, latitude: event.target.value }))}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(event) => setForm((f) => ({ ...f, longitude: event.target.value }))}
            />
            <Input
              label="Service area (km)"
              type="number"
              min="0"
              max="200"
              value={form.serviceAreaKm}
              onChange={(event) => setForm((f) => ({ ...f, serviceAreaKm: event.target.value }))}
              hint="Maximum straight-line distance for matches"
            />

            <Input
              label="People served per day"
              type="number"
              min="0"
              value={form.dailyPeopleServed}
              onChange={(event) => setForm((f) => ({ ...f, dailyPeopleServed: event.target.value }))}
            />
            <Input
              label="Maximum storage (portions)"
              type="number"
              min="0"
              value={form.maxStoragePortions}
              onChange={(event) => setForm((f) => ({ ...f, maxStoragePortions: event.target.value }))}
            />
            <Field label="Chilled storage" className="span-2">
              <label className="checkbox-row" htmlFor="canStoreChilled">
                <input
                  id="canStoreChilled"
                  type="checkbox"
                  checked={form.canStoreChilled}
                  onChange={(event) => setForm((f) => ({ ...f, canStoreChilled: event.target.checked }))}
                />
                <span>
                  <span className="strong small" style={{ display: 'block' }}>
                    We can store chilled food
                  </span>
                  <span className="tiny muted">
                    Needed to be eligible for perishable collections that must stay refrigerated.
                  </span>
                </span>
              </label>
            </Field>

            <Field label="Preferred food categories" className="span-2" hint="Used to score how well a donation fits.">
              <div className="row-wrap">
                {FOOD_CATEGORIES.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={`chip chip-button ${form.preferredCategories.includes(category) ? 'chip-active' : ''}`}
                    aria-pressed={form.preferredCategories.includes(category)}
                    onClick={() => toggleList('preferredCategories', category)}
                  >
                    {humanize(category)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Dietary categories we can handle" className="span-2">
              <div className="row-wrap">
                {DIETARY_CLASSIFICATIONS.map((diet) => (
                  <button
                    type="button"
                    key={diet}
                    className={`chip chip-button ${form.dietaryCategories.includes(diet) ? 'chip-active' : ''}`}
                    aria-pressed={form.dietaryCategories.includes(diet)}
                    onClick={() => toggleList('dietaryCategories', diet)}
                  >
                    {humanize(diet)}
                  </button>
                ))}
              </div>
            </Field>

            <div className="span-2 row">
              <Button type="submit" variant="primary" icon={Save} loading={saving}>
                Save profile
              </Button>
              <span className="small muted">Type, identity and verification status cannot be edited here.</span>
            </div>
          </form>
        </Card>

        <div className="stack">
          <Card>
            <CardHeader
              title="Verification documents"
              subtitle="Supporting documents are visible to platform administrators only."
            />
            <div className="card-body stack">
              <label className="field">
                <span className="field-label">Document label</span>
                <Select
                  value={documentLabel}
                  onChange={(event) => setDocumentLabel(event.target.value)}
                  options={[
                    'Registration certificate',
                    'Food safety licence',
                    'Tax registration',
                    'NGO registration',
                    'Other supporting document',
                  ]}
                />
              </label>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <FileUp size={16} aria-hidden="true" />
                {uploading ? 'Uploading…' : 'Upload a document'}
                <input type="file" hidden onChange={uploadDocument} disabled={uploading} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
              </label>

              {documents.length ? (
                <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
                  {documents.map((doc, index) => (
                    <li key={index} className="stack-sm" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
                      <span className="small strong">{doc.label || doc.originalName || 'Document'}</span>
                      <span className="tiny muted">
                        {doc.originalName} · {formatDate(doc.uploadedAt, { withTime: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small muted">No documents uploaded yet.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Verification record" />
            <div className="card-body">
              <DetailList
                items={[
                  { label: 'Status', value: <StatusBadge status={status} /> },
                  { label: 'Submitted', value: org.verification?.submittedAt ? formatDate(org.verification.submittedAt, { withTime: true }) : '—' },
                  { label: 'Decided', value: org.verification?.decidedAt ? formatDate(org.verification.decidedAt, { withTime: true }) : '—' },
                  { label: 'Attempt', value: org.verification?.attempt ?? '—' },
                  { label: 'Reviewer notes', value: org.verification?.reason || '—' },
                  { label: 'Your membership role', value: humanize(org.membershipRole || sessionOrg?.membershipRole) },
                ]}
              />
              {status === 'PENDING' ? (
                <p className="tiny muted mt-3">
                  <ShieldAlert size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> You will
                  be notified in-app as soon as a decision is recorded.
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Public profile" subtitle="What other organizations see about you." />
            <div className="card-body stack-sm">
              <Badge variant="neutral">{humanize(org.type)}</Badge>
              <p className="small">{org.description || 'No description provided yet.'}</p>
              <p className="tiny muted">
                {org.addressLine}, {org.city}
                {org.region ? `, ${org.region}` : ''}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default OrganizationPage;
