import { Link } from 'react-router-dom';
import {
  Brain,
  Building2,
  CalendarCheck,
  Handshake,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Utensils,
} from 'lucide-react';
import { LinkButton } from '../../components/ui.jsx';

const STEPS = [
  {
    title: 'Predict surplus',
    body: 'Canteens and kitchens log expected covers and past surplus so the forecast shows how much food is likely to be spare before service ends.',
    icon: Brain,
  },
  {
    title: 'Find recipients',
    body: 'Eligible NGOs, shelters and community kitchens are ranked by distance, capacity, dietary fit and reliability — with the reasoning shown, never a black box.',
    icon: Users,
  },
  {
    title: 'Reserve food',
    body: 'Recipients claim exactly what they can collect. Allocation is atomic, so two organizations can never be promised the same portion.',
    icon: CalendarCheck,
  },
  {
    title: 'Coordinate pickup',
    body: 'A volunteer or partner is assigned, the route is shown on a map, and the collection window is tracked.',
    icon: Truck,
  },
  {
    title: 'Verify handover',
    body: 'A one-time code confirms the food changed hands. The recipient then confirms what actually arrived, including any shortfall.',
    icon: ShieldCheck,
  },
  {
    title: 'Measure impact',
    body: 'Only confirmed deliveries count. Every total is traceable back to the donation, the handover, and the person who confirmed it.',
    icon: Sparkles,
  },
];

const AUDIENCE = [
  { label: 'College canteens and messes', icon: Utensils },
  { label: 'Restaurants, hotels and caterers', icon: Building2 },
  { label: 'Event organisers', icon: CalendarCheck },
  { label: 'NGOs and charitable trusts', icon: Handshake },
  { label: 'Shelters and community kitchens', icon: Users },
  { label: 'Volunteer delivery partners', icon: Truck },
];

/** Landing page: what the platform does, for whom, and how the loop closes. */
export function LandingPage() {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> Surplus food, redistributed
          </span>
          <h1 className="mt-3">
            Rescue Surplus. <br />
            <span className="text-gradient">Nourish Communities.</span>
          </h1>
          <p className="hero-lead">
            Foodkind connects food donors with verified organizations that turn surplus into hot meals —
            and follows every batch all the way to the plate with code-verified handover.
          </p>
          <div className="hero-actions">
            <LinkButton to="/register" variant="primary" size="lg" icon={Leaf}>
              Register your organization
            </LinkButton>
            <LinkButton to="/how-it-works" variant="secondary" size="lg">
              See how it works
            </LinkButton>
          </div>
          <div className="row-wrap mt-5" style={{ gap: 'var(--space-4)' }}>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span>
              <span className="small muted">Atomic allocation</span>
            </div>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span>
              <span className="small muted">6-digit handover PIN</span>
            </div>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span>
              <span className="small muted">Audited actuals only</span>
            </div>
          </div>
          <p className="small muted mt-4">
            Already partnered with us? <Link to="/login" style={{ fontWeight: 600 }}>Sign in to your account</Link>.
          </p>
        </div>

        <aside className="hero-panel" aria-label="Platform scope">
          <h2 className="text-center" style={{ fontSize: 'var(--text-lg)' }}>
            Built for the whole chain
          </h2>
          <ul className="stack mt-4" style={{ listStyle: 'none', padding: 0 }}>
            {AUDIENCE.map((item) => (
              <li key={item.label} className="row">
                <span
                  aria-hidden="true"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--green-soft)',
                    color: 'var(--green-dark)',
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={16} />
                </span>
                <span className="small">{item.label}</span>
              </li>
            ))}
          </ul>
          <p className="tiny muted mt-4">
            Organizations are verified by platform administrators before they can publish or claim food.
          </p>
        </aside>
      </section>

      <section className="section section-alt">
        <span className="eyebrow">The complete loop</span>
        <h2 className="mt-2">From predicted surplus to verified redistribution</h2>
        <p className="muted mt-3" style={{ maxWidth: '72ch' }}>
          Most surplus food is wasted in the gap between “we cooked too much” and “someone collected it”.
          Foodkind closes that gap with one continuous workflow.
        </p>
        <div className="flow-steps mt-6">
          {STEPS.map((step, index) => (
            <article className="flow-step" key={step.title}>
              <span className="flow-step-index" aria-hidden="true">
                {index + 1}
              </span>
              <span
                aria-hidden="true"
                style={{ color: 'var(--green-dark)', display: 'inline-flex', marginBottom: 'var(--space-2)' }}
              >
                <step.icon size={20} />
              </span>
              <h3 style={{ fontSize: 'var(--text-base)' }}>{step.title}</h3>
              <p className="small muted mt-2">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="grid grid-2">
          <div>
            <span className="eyebrow">Why it is different</span>
            <h2 className="mt-2">Explainable matching, not guesswork</h2>
            <p className="muted mt-3">
              Every recommendation comes with its reasoning: how far away the recipient is, whether their
              capacity fits the quantity, whether the food matches what they need, and how reliable they have
              been. Donors can see exactly why an organization was suggested.
            </p>
            <p className="muted mt-3">
              Allocation is enforced in the database with atomic updates. When demand is high, the platform
              refuses the reservation instead of overselling food that does not exist.
            </p>
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: 'var(--text-base)' }}>What we do not claim</h3>
            <ul className="stack-sm mt-3 small muted" style={{ paddingLeft: '1.1rem' }}>
              <li>
                Foodkind does not certify food safety compliance or replace local food-hygiene regulation.
              </li>
              <li>
                Donors make the safety declarations; the platform records them, timestamps them, and keeps
                them auditable.
              </li>
              <li>
                Impact figures count only deliveries a recipient has confirmed. Nothing is estimated into the
                headline numbers.
              </li>
              <li>
                Surplus forecasts are statistical estimates from your own history, shown with their
                uncertainty and flagged when there is not enough data.
              </li>
            </ul>
            <p className="small mt-4">
              <Link to="/food-safety">Read our food safety and responsible redistribution guidance</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="card card-pad text-center">
          <MapPin size={22} aria-hidden="true" style={{ margin: '0 auto', color: 'var(--green-dark)' }} />
          <h2 className="mt-3" style={{ fontSize: 'var(--text-xl)' }}>
            Ready to put today&apos;s surplus to work?
          </h2>
          <p className="muted mt-2" style={{ maxWidth: '58ch', margin: '0 auto' }}>
            Register your canteen, restaurant, hostel, event, NGO or shelter. An administrator reviews your
            organization, and then you can publish or claim surplus food in minutes.
          </p>
          <div className="row mt-5" style={{ justifyContent: 'center' }}>
            <LinkButton to="/register" variant="primary" icon={Leaf}>
              Create an account
            </LinkButton>
            <LinkButton to="/how-it-works" variant="secondary">
              Walk through the workflow
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}

export default LandingPage;
