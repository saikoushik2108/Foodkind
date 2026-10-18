import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Brain,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Droplets,
  Leaf,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Truck,
  Users,
} from 'lucide-react';
import { Alert, LinkButton } from '../../components/ui.jsx';

/** Shared page frame for marketing content. */
function StaticPage({ title, subtitle, children }) {
  return (
    <div className="section">
      <span className="eyebrow">Foodkind</span>
      <h1 className="mt-2">{title}</h1>
      {subtitle ? (
        <p className="muted mt-3" style={{ maxWidth: '70ch', fontSize: 'var(--text-lg)' }}>
          {subtitle}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}

/** How It Works — the six roles and what each one does. */
export function HowItWorksPage() {
  const roleSteps = [
    {
      icon: Leaf,
      title: '1. Donor publishes surplus',
      points: [
        'Describes the food: category, dietary classification, allergens, quantity and unit.',
        'Declares preparation time, storage requirement, packaging and handling instructions.',
        'Confirms three safety declarations before the listing can be published.',
        'Sets the pickup window and the deadline after which the food must not be collected.',
      ],
    },
    {
      icon: Brain,
      title: '2. Platform predicts and ranks',
      points: [
        'A forecast estimates expected surplus from the donor’s own recorded history.',
        'Eligible recipients are filtered first (verified, within service range, capable).',
        'Surviving candidates are scored and returned with written reasons for each score.',
      ],
    },
    {
      icon: CalendarCheck,
      title: '3. Recipient reserves',
      points: [
        'The recipient requests the quantity it can genuinely collect and use.',
        'Allocation is atomic: the held quantity can never exceed what remains available.',
        'The donor accepts or declines; declining releases the food back to the pool instantly.',
      ],
    },
    {
      icon: Truck,
      title: '4. Pickup is coordinated',
      points: [
        'A volunteer, delivery partner, or the recipient arranges self-pickup.',
        'Pickup and delivery addresses, windows and instructions travel with the task.',
        'Everyone involved can see the collection point on a map.',
      ],
    },
    {
      icon: ShieldCheck,
      title: '5. Handover is verified',
      points: [
        'Confirming arrival issues a six-digit code to the donor, not to the collector.',
        'The collector reads the code back; the exchange is what unlocks completion.',
        'Incorrect codes are refused and rate-limited; codes expire quickly.',
      ],
    },
    {
      icon: ClipboardCheck,
      title: '6. Delivery is confirmed and recorded',
      points: [
        'The recipient records the quantity actually received — including shortfalls.',
        'The donation’s available, reserved and collected quantities always reconcile.',
        'Only confirmed receipts feed the impact totals and future forecasts.',
      ],
    },
  ];

  return (
    <StaticPage
      title="How Foodkind works"
      subtitle="One continuous loop: predict surplus, find the right recipient, reserve food, coordinate collection, verify the handover, and measure what actually reached people."
    >
      <div className="grid grid-2">
        {roleSteps.map((step) => (
          <article className="card card-pad" key={step.title}>
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--green-soft)',
                color: 'var(--green-dark)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <step.icon size={19} />
            </span>
            <h3 style={{ fontSize: 'var(--text-base)' }}>{step.title}</h3>
            <ul className="stack-sm mt-3 small muted" style={{ paddingLeft: '1.1rem' }}>
              {step.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="card card-pad mt-6">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Roles and permissions</h2>
        <div className="table-wrap mt-4">
          <table className="table">
            <caption className="sr-only">What each role can do</caption>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Can do</th>
                <th scope="col">Cannot do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="strong">Donor (canteen, restaurant, mess, event)</td>
                <td>Publish listings, review matches, accept reservations, arrange pickups, confirm actual surplus</td>
                <td>Reserve or claim food for redistribution</td>
              </tr>
              <tr>
                <td className="strong">Recipient (NGO, shelter, kitchen, food bank)</td>
                <td>Browse the marketplace, post demand requests, reserve food, confirm delivery received</td>
                <td>Publish surplus listings</td>
              </tr>
              <tr>
                <td className="strong">Delivery partner / volunteer</td>
                <td>See assigned pickups, confirm arrival, verify the handover code, report issues</td>
                <td>Change quantities or accept reservations</td>
              </tr>
              <tr>
                <td className="strong">Volunteer contributor</td>
                <td>Carry out assigned collections and file incident reports</td>
                <td>Accept or decline reservations; access administrative tools</td>
              </tr>
              <tr>
                <td className="strong">Administrator</td>
                <td>Verify organizations, manage users, monitor donations and pickups, resolve incidents, read the audit trail</td>
                <td>Bypass food-safety state on a live custody record</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="row mt-6">
        <LinkButton to="/register" variant="primary">
          Register your organization
        </LinkButton>
        <LinkButton to="/food-safety" variant="secondary">
          Food safety guidance
        </LinkButton>
      </div>
    </StaticPage>
  );
}

/** About — the problem, the approach, and the boundaries of the platform. */
export function AboutPage() {
  return (
    <StaticPage
      title="About Foodkind"
      subtitle="A community-first platform that turns surplus into social impact — built so that good food reaches people instead of bins."
    >
      <div className="grid grid-2">
        <div className="card card-pad">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>The problem we are solving</h2>
          <p className="muted mt-3">
            Institutional kitchens routinely prepare for the expected crowd, and the crowd often does not
            arrive as expected. The surplus is usually edible, but it becomes waste because nobody has time
            to find a recipient, agree a collection window, and prove the handover happened.
          </p>
          <p className="muted mt-3">
            On the other side, community kitchens and shelters rarely have visibility into what is available
            nearby, or confidence that food offered an hour ago is still safe to serve.
          </p>
        </div>

        <div className="card card-pad">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Our approach</h2>
          <ul className="stack-sm mt-3 small" style={{ paddingLeft: '1.1rem' }}>
            <li>Make publishing surplus fast, but require an explicit safety declaration first.</li>
            <li>Recommend the right recipient with reasons, not just a ranked list.</li>
            <li>Guarantee that a portion can only be promised once.</li>
            <li>Prove the handover with a code the donor controls.</li>
            <li>Count only verified deliveries in the impact numbers.</li>
            <li>Keep an audit trail of every decision that moved food.</li>
          </ul>
        </div>

        <div className="card card-pad">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Who it is for</h2>
          <p className="muted mt-3">
            College canteens and hostel messes, restaurants, hotels and caterers, event organisers,
            verified NGOs and charitable organizations, shelters and community kitchens, authorized
            volunteers and delivery partners, and the platform administrators who verify them.
          </p>
        </div>

        <div className="card card-pad">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Boundaries we are honest about</h2>
          <ul className="stack-sm mt-3 small muted" style={{ paddingLeft: '1.1rem' }}>
            <li>We are not a food-safety regulator and we do not certify kitchens.</li>
            <li>Forecasts are statistical estimates from your own history and are labelled as such.</li>
            <li>Verify any figures you rely on against the underlying donation records in the app.</li>
            <li>Optional integrations (email delivery, image analysis) degrade gracefully when unconfigured.</li>
          </ul>
          <p className="small mt-4">
            <Link to="/food-safety">Read the food safety guidance</Link>
          </p>
        </div>
      </div>
    </StaticPage>
  );
}

/** Food safety and responsible redistribution. */
export function FoodSafetyPage() {
  return (
    <StaticPage
      title="Food safety and responsible redistribution"
      subtitle="Redistributed food is only a good outcome if it is safe. These are the rules Foodkind asks every partner to work within."
    >
      <Alert variant="warning" title="This is guidance, not certification">
        Foodkind records the declarations donors make and keeps them auditable. It does not inspect
        kitchens, and it does not certify compliance with any food-safety law or standard. Always follow
        your local food-hygiene regulations and the judgement of your own food-safety supervisor.
      </Alert>

      <div className="grid grid-2 mt-5">
        <div className="card card-pad">
          <span aria-hidden="true" style={{ color: 'var(--green-dark)' }}>
            <Clock size={20} />
          </span>
          <h3 className="mt-2" style={{ fontSize: 'var(--text-base)' }}>Time and temperature</h3>
          <ul className="stack-sm mt-3 small muted" style={{ paddingLeft: '1.1rem' }}>
            <li>Record when the food was prepared and, where relevant, when it was cooked.</li>
            <li>State the storage requirement honestly: ambient, chilled, frozen, or hot holding.</li>
            <li>Keep hot food hot and cold food cold through preparation, storage and transport.</li>
            <li>Never offer food that has spent an unknown amount of time in the temperature danger zone.</li>
            <li>Set a collection deadline you would defend to a health inspector, and stick to it.</li>
          </ul>
        </div>

        <div className="card card-pad">
          <span aria-hidden="true" style={{ color: 'var(--green-dark)' }}>
            <Thermometer size={20} />
          </span>
          <h3 className="mt-2" style={{ fontSize: 'var(--text-base)' }}>The three declarations</h3>
          <p className="small muted mt-3">
            A listing cannot be published until the donor confirms all three, and the confirmation is
            attributed and timestamped:
          </p>
          <ul className="stack-sm mt-3 small" style={{ paddingLeft: '1.1rem' }}>
            <li>Prepared in a clean, hygienic facility.</li>
            <li>Fit for human consumption at the time of listing.</li>
            <li>Within a safe window for redistribution given the storage conditions.</li>
          </ul>
          <p className="tiny muted mt-3">
            Declaring these is a commitment, not a formality: they are part of the auditable record of the
            donation.
          </p>
        </div>

        <div className="card card-pad">
          <span aria-hidden="true" style={{ color: 'var(--green-dark)' }}>
            <Snowflake size={20} />
          </span>
          <h3 className="mt-2" style={{ fontSize: 'var(--text-base)' }}>Packaging and handling</h3>
          <ul className="stack-sm mt-3 small muted" style={{ paddingLeft: '1.1rem' }}>
            <li>Prefer sealed packaging; if using open trays, say so and cover them properly.</li>
            <li>Label allergens clearly and declare them accurately — including traces where relevant.</li>
            <li>Give handling and reheating instructions the receiving kitchen can follow.</li>
            <li>Separate raw and ready-to-eat food during transport.</li>
          </ul>
        </div>

        <div className="card card-pad">
          <span aria-hidden="true" style={{ color: 'var(--green-dark)' }}>
            <Droplets size={20} />
          </span>
          <h3 className="mt-2" style={{ fontSize: 'var(--text-base)' }}>When in doubt, do not redistribute</h3>
          <ul className="stack-sm mt-3 small muted" style={{ paddingLeft: '1.1rem' }}>
            <li>Discard food that has been left out beyond safe limits, however good it looks.</li>
            <li>Do not redistribute food that has already been served to a table or placed on a buffet line.</li>
            <li>Do not redistribute anything you would not serve to your own family.</li>
            <li>
              If food turns out to be unsafe, use the incident tools rather than quietly cancelling — that is
              how the platform and its partners learn.
            </li>
          </ul>
        </div>
      </div>

      <div className="card card-pad mt-5">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>What the platform enforces for you</h2>
        <ul className="stack-sm mt-3 small" style={{ paddingLeft: '1.1rem' }}>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Only verified
            organizations can publish or claim food.
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> A portion can
            only be promised once, so no recipient arrives to empty trays.
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Handover is
            confirmed with a one-time code issued to the donor.
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Food already in
            custody cannot simply be cancelled — it must be routed through an incident report.
          </li>
          <li>
            <AlertTriangle size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Every status
            change is attributed and appears in the audit log.
          </li>
        </ul>
      </div>

      <div className="row mt-6">
        <LinkButton to="/register" variant="primary" icon={Users}>
          Register your organization
        </LinkButton>
        <LinkButton to="/how-it-works" variant="secondary">
          How the workflow runs
        </LinkButton>
      </div>
    </StaticPage>
  );
}

export default HowItWorksPage;
