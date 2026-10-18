import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Crosshair, Leaf, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Alert, Button, Checkbox, Field, Input, Select, Textarea } from '../../components/ui.jsx';
import { ORG_TYPES, humanize } from '../../constants/domain.js';

const schema = z
  .object({
    name: z.string().min(2, 'Please enter your full name').max(120),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    phone: z.string().max(25).optional(),
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Confirm your password'),

    organizationName: z.string().min(2, 'Organization name is required').max(160),
    organizationType: z.enum(ORG_TYPES, { message: 'Choose an organization type' }),
    organizationDescription: z.string().max(2000).optional(),

    addressLine: z.string().min(4, 'Street address is required').max(300),
    city: z.string().min(2, 'City is required').max(120),
    region: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(80).optional(),

    latitude: z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
    longitude: z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),

    serviceAreaKm: z.coerce.number().min(0).max(200).optional(),
    dailyPeopleServed: z.coerce.number().min(0).optional(),
    maxStoragePortions: z.coerce.number().min(0).optional(),
    canStoreChilled: z.boolean().optional(),
    acceptedPolicies: z.literal(true, { message: 'You must accept the platform policies to register' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const TYPE_DESCRIPTIONS = {
  DONOR: 'Canteens, cafeterias, hostels, messes, restaurants, hotels, caterers and event organisers that have surplus food to offer.',
  RECIPIENT: 'NGOs, charitable organizations, shelters, community kitchens and food banks that redistribute food to people.',
  PARTNER: 'Authorized volunteer and delivery partners who collect and transport food between donors and recipients.',
};

/** Partner registration: creates the user and a pending organization. */
export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [geoStatus, setGeoStatus] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      country: 'India',
      organizationType: 'DONOR',
      canStoreChilled: true,
      acceptedPolicies: false,
      latitude: 12.9716,
      longitude: 77.5946,
      serviceAreaKm: 25,
    },
  });

  const organizationType = watch('organizationType');

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      setGeoStatus('This browser does not support location lookup.');
      return;
    }
    setGeoStatus('Looking up your location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', Number(position.coords.latitude.toFixed(6)), { shouldValidate: true });
        setValue('longitude', Number(position.coords.longitude.toFixed(6)), { shouldValidate: true });
        setGeoStatus('Coordinates filled in from your device.');
      },
      () => setGeoStatus('Could not read your location. Enter the coordinates manually.'),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function onSubmit(values) {
    setFormError('');
    setFieldErrors({});
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        phone: values.phone || '',
        password: values.password,
        confirmPassword: values.confirmPassword,
        organizationName: values.organizationName,
        organizationType: values.organizationType,
        organizationDescription: values.organizationDescription || '',
        addressLine: values.addressLine,
        city: values.city,
        region: values.region || '',
        postalCode: values.postalCode || '',
        country: values.country || 'India',
        location: {
          type: 'Point',
          coordinates: [Number(values.longitude), Number(values.latitude)],
        },
        serviceAreaKm: Number(values.serviceAreaKm) || 10,
        dailyPeopleServed: Number(values.dailyPeopleServed) || 0,
        maxStoragePortions: Number(values.maxStoragePortions) || 0,
        canStoreChilled: Boolean(values.canStoreChilled),
        acceptedPolicies: true,
      });

      toast.success(
        'Account created. An administrator will review your organization before you can publish or claim food.',
        { title: 'Welcome to Foodkind' }
      );
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message);
      if (error.fieldErrors) setFieldErrors(error.fieldErrors);
    }
  }

  const errorFor = (name) => errors[name]?.message || fieldErrors[name];

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={20} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Foodkind</span>
            <span className="brand-tagline">Rescue · Nourish</span>
          </span>
        </Link>
        <h2>Join the redistribution network.</h2>
        <p>
          Registration creates your account and your organization profile. An administrator verifies the
          organization before it can publish or claim food — this is what keeps the network trustworthy.
        </p>
        <ul className="auth-aside-list" style={{ listStyle: 'none', padding: 0 }}>
          <li>Tell us where you operate so matches are geographically realistic.</li>
          <li>Describe your capacity so we never offer you food you cannot store or serve.</li>
          <li>You can upload verification documents from your organization page afterwards.</li>
        </ul>
      </aside>

      <div className="auth-form-side">
        <div className="auth-card auth-card-wide">
          <span className="eyebrow">Partner registration</span>
          <h1 className="mt-2" style={{ fontSize: 'var(--text-2xl)' }}>
            Register your organization
          </h1>
          <p className="muted mt-2 small">
            Already have an account? <Link to="/login">Sign in</Link>.
          </p>

          {formError ? (
            <div className="mt-4">
              <Alert variant="danger" title="Registration could not be completed">
                {formError}
              </Alert>
            </div>
          ) : null}

          <form className="stack mt-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <fieldset>
              <legend>Your details</legend>
              <div className="form-grid">
                <Input label="Full name" required error={errorFor('name')} autoComplete="name" {...register('name')} />
                <Input
                  label="Email address"
                  type="email"
                  required
                  error={errorFor('email')}
                  autoComplete="email"
                  {...register('email')}
                />
                <Input label="Phone number" error={errorFor('phone')} autoComplete="tel" {...register('phone')} />
                <Input
                  label="Password"
                  type="password"
                  required
                  hint="At least 8 characters"
                  error={errorFor('password')}
                  autoComplete="new-password"
                  {...register('password')}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  required
                  error={errorFor('confirmPassword')}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Organization</legend>
              <div className="form-grid">
                <Input
                  label="Organization name"
                  required
                  className="span-2"
                  error={errorFor('organizationName')}
                  {...register('organizationName')}
                />
                <Select
                  label="Organization type"
                  required
                  error={errorFor('organizationType')}
                  options={ORG_TYPES.map((type) => ({ value: type, label: humanize(type) }))}
                  {...register('organizationType')}
                />
                <Field label="What this type does" className="span-2">
                  <p className="small muted" style={{ margin: 0 }}>
                    <Building2 size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                    {TYPE_DESCRIPTIONS[organizationType]}
                  </p>
                </Field>
                <Textarea
                  label="Short description"
                  className="span-2"
                  rows={3}
                  hint="What you cook or distribute, and for whom."
                  error={errorFor('organizationDescription')}
                  {...register('organizationDescription')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Location</legend>
              <div className="form-grid">
                <Input
                  label="Street address"
                  required
                  className="span-2"
                  error={errorFor('addressLine')}
                  autoComplete="street-address"
                  {...register('addressLine')}
                />
                <Input label="City" required error={errorFor('city')} autoComplete="address-level2" {...register('city')} />
                <Input label="Region / state" error={errorFor('region')} autoComplete="address-level1" {...register('region')} />
                <Input label="Postal code" error={errorFor('postalCode')} autoComplete="postal-code" {...register('postalCode')} />
                <Input label="Country" error={errorFor('country')} autoComplete="country-name" {...register('country')} />
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  required
                  error={errorFor('latitude')}
                  hint="Used for distance-based matching"
                  {...register('latitude')}
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  required
                  error={errorFor('longitude')}
                  {...register('longitude')}
                />
                <Field label="Coordinates" className="span-2" hint={geoStatus || 'Coordinates are used for distance-based matching.'}>
                  <div className="row-wrap" style={{ gap: 'var(--space-2)' }}>
                    <Button type="button" variant="secondary" size="sm" icon={Crosshair} onClick={useBrowserLocation}>
                      Use my current location
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setValue('latitude', 12.9716, { shouldValidate: true });
                        setValue('longitude', 77.5946, { shouldValidate: true });
                        setValue('city', 'Bengaluru', { shouldValidate: true });
                        setValue('region', 'Karnataka');
                        setGeoStatus('Set to Bengaluru coordinates (12.9716, 77.5946)');
                      }}
                    >
                      📍 Bengaluru
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setValue('latitude', 19.0760, { shouldValidate: true });
                        setValue('longitude', 72.8777, { shouldValidate: true });
                        setValue('city', 'Mumbai', { shouldValidate: true });
                        setValue('region', 'Maharashtra');
                        setGeoStatus('Set to Mumbai coordinates (19.0760, 72.8777)');
                      }}
                    >
                      📍 Mumbai
                    </Button>
                  </div>
                </Field>
                <Input
                  label="Service area (km)"
                  type="number"
                  min="0"
                  max="200"
                  error={errorFor('serviceAreaKm')}
                  {...register('serviceAreaKm')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Capacity</legend>
              <div className="form-grid">
                <Input
                  label="People served per day"
                  type="number"
                  min="0"
                  error={errorFor('dailyPeopleServed')}
                  {...register('dailyPeopleServed')}
                />
                <Input
                  label="Maximum storage (portions)"
                  type="number"
                  min="0"
                  error={errorFor('maxStoragePortions')}
                  {...register('maxStoragePortions')}
                />
              </div>
              <div className="mt-4">
                <Checkbox
                  label="We can store chilled food"
                  description="Needed for perishable collections that must stay refrigerated."
                  {...register('canStoreChilled')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Policies</legend>
              <Checkbox
                label="I accept the platform policies"
                description="Including the food-safety responsibilities described in the food safety guidance. Declarations you make on a listing are recorded and auditable."
                {...register('acceptedPolicies')}
              />
              {errorFor('acceptedPolicies') ? (
                <span className="field-error" role="alert">
                  {errorFor('acceptedPolicies')}
                </span>
              ) : null}
              <p className="small muted mt-3">
                Read the <Link to="/food-safety">food safety and responsible redistribution guidance</Link> before
                you publish food.
              </p>
            </fieldset>

            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} icon={UserPlus} className="btn-block">
              Create account
            </Button>

            <p className="tiny muted text-center">
              Account and organization details are stored only for coordinating food redistribution.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
