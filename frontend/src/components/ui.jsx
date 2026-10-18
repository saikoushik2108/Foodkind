/**
 * The shared UI kit.
 *
 * One small set of primitives keeps spacing, colour and accessibility
 * consistent across all thirty pages. Every interactive element is reachable
 * and labelled for keyboard and screen-reader users.
 */
import { forwardRef, useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';

/* ── Buttons ─────────────────────────────────────────────────────────── */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  type = 'button',
  className = '',
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${sizeClass} ${className}`.trim()}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="spin-icon" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={16} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

/** A router-aware button-shaped link (never triggers a full page reload). */
export function LinkButton({ to, children, variant = 'primary', size = 'sm', icon: Icon, className = '' }) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <Link to={to} className={`btn btn-${variant} ${sizeClass} ${className}`.trim()}>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}

/* ── Surfaces ────────────────────────────────────────────────────────── */
export function Card({ children, className = '', as: Tag = 'section' }) {
  return <Tag className={`card ${className}`.trim()}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, action, children }) {
  return (
    <header className="card-header">
      <div>
        {title ? <h3>{title}</h3> : null}
        {subtitle ? <p className="small muted mt-2">{subtitle}</p> : null}
        {children}
      </div>
      {action ? <div className="row">{action}</div> : null}
    </header>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  return (
    <div className="stat-card">
      <div className="spread">
        <span className="stat-label">{label}</span>
        {Icon ? (
          <span
            aria-hidden="true"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: tone === 'warning' ? 'var(--amber-soft)' : 'var(--green-soft)',
              color: tone === 'warning' ? 'var(--amber)' : 'var(--green-dark)',
            }}
          >
            <Icon size={17} />
          </span>
        ) : null}
      </div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

/* ── Badges ──────────────────────────────────────────────────────────── */
export function Badge({ children, variant = 'neutral' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

const STATUS_VARIANTS = {
  // Donations
  DRAFT: 'neutral',
  AVAILABLE: 'success',
  PARTIALLY_RESERVED: 'warning',
  RESERVED: 'warning',
  PICKUP_ASSIGNED: 'info',
  COLLECTED: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
  SAFETY_HOLD: 'danger',
  DISPUTED: 'danger',
  // Reservations and pickups
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  ASSIGNED: 'info',
  ARRIVED: 'info',
  FAILED: 'danger',
  // Verification
  APPROVED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  ACTIVE: 'success',
  // Incidents
  OPEN: 'danger',
  INVESTIGATING: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

/** Humanise an enum value: PARTIALLY_RESERVED → "Partially reserved". */
export function humanize(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusBadge({ status, label }) {
  if (!status) return <span className="faint">—</span>;
  return <Badge variant={STATUS_VARIANTS[status] || 'neutral'}>{label || humanize(status)}</Badge>;
}

/* ── Alerts ──────────────────────────────────────────────────────────── */
const ALERT_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export function Alert({ variant = 'info', title, children, action }) {
  const Icon = ALERT_ICONS[variant] || Info;
  return (
    <div className={`alert alert-${variant}`} role={variant === 'danger' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div className="grow">
        {title ? <div className="alert-title">{title}</div> : null}
        {children}
      </div>
      {action}
    </div>
  );
}

/* ── Form fields ─────────────────────────────────────────────────────── */
export function Field({ label, htmlFor, hint, error, required, children, className = '' }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, required, id, ...rest }, ref) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <input
        id={inputId}
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        ref={ref}
        {...rest}
      />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, required, id, ...rest }, ref) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <textarea id={inputId} className="textarea" aria-invalid={error ? 'true' : undefined} ref={ref} {...rest} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, required, id, children, options, ...rest }, ref) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <select id={inputId} className="select" aria-invalid={error ? 'true' : undefined} ref={ref} {...rest}>
        {children ||
          (options || []).map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const text = typeof option === 'string' ? humanize(option) : option.label;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
      </select>
    </Field>
  );
});

export const Checkbox = forwardRef(function Checkbox({ label, description, id, ...rest }, ref) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <label className="checkbox-row" htmlFor={inputId}>
      <input id={inputId} type="checkbox" ref={ref} {...rest} />
      <span>
        <span className="strong small" style={{ display: 'block' }}>
          {label}
        </span>
        {description ? <span className="tiny muted">{description}</span> : null}
      </span>
    </label>
  );
});

/* ── Feedback ────────────────────────────────────────────────────────── */
export function Skeleton({ variant = 'text', count = 1, width }) {
  const className =
    variant === 'title' ? 'skeleton skeleton-title' : variant === 'block' ? 'skeleton skeleton-block' : 'skeleton skeleton-text';
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={className} style={width ? { width } : undefined} />
      ))}
    </>
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div aria-live="polite" aria-busy="true">
      <div className="loading-block">
        <Loader2 size={18} className="spin-icon" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

/* ── Modal and confirmation ──────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal ${size === 'lg' ? 'modal-lg' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="card-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="card-body">{children}</div>
        {footer ? <div className="card-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({ open, onCancel, onConfirm, title, children, confirmLabel = 'Confirm', variant = 'danger', loading }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="stack">
        <div>{children}</div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Tables ──────────────────────────────────────────────────────────── */
export function DataTable({ columns, rows, keyField = 'id', empty, caption }) {
  if (!rows?.length) {
    return empty ?? <EmptyState title="Nothing to show yet" description="Records will appear here once there is activity." />;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" style={column.align ? { textAlign: column.align } : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[keyField] ?? index}>
              {columns.map((column) => (
                <td key={column.key} style={column.align ? { textAlign: column.align } : undefined}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, total, limit, onPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </span>
      <div className="pagination-controls">
        <Button variant="secondary" size="sm" icon={ArrowLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="tiny muted" style={{ alignSelf: 'center' }}>
          Page {page} of {Math.max(1, totalPages || 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= (totalPages || 1)}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/* ── Tabs ────────────────────────────────────────────────────────────── */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          className={`tab ${active === tab.value ? 'tab-active' : ''}`.trim()}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined ? <span className="muted tiny"> ({tab.count})</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ── Allocation meter ────────────────────────────────────────────────── */
export function AllocationMeter({ quantity, available, reserved, collected, label = 'Allocation' }) {
  const total = Number(quantity) || 1;
  const pct = (value) => `${Math.max(0, Math.min(100, (Number(value) || 0) / total * 100))}%`;
  return (
    <div className="stack-sm">
      <div className="spread">
        <span className="tiny muted strong">{label}</span>
        <span className="tiny muted">
          {available} available · {reserved} reserved · {collected} collected
        </span>
      </div>
      <div className="meter-row" role="img" aria-label={`${available} of ${quantity} available, ${reserved} reserved, ${collected} collected`}>
        <span className="meter-seg meter-seg-available" style={{ width: pct(available) }} />
        <span className="meter-seg meter-seg-reserved" style={{ width: pct(reserved) }} />
        <span className="meter-seg meter-seg-collected" style={{ width: pct(collected) }} />
      </div>
    </div>
  );
}

/* ── Detail list ─────────────────────────────────────────────────────── */
export function DetailList({ items }) {
  return (
    <dl className="detail-list">
      {items
        .filter((item) => item && item.value !== undefined)
        .map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value === null || item.value === '' ? <span className="faint">—</span> : item.value}</dd>
          </div>
        ))}
    </dl>
  );
}

/* ── Page header ─────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="row-wrap">{actions}</div> : null}
    </div>
  );
}

/* ── Formatting helpers ──────────────────────────────────────────────── */
export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatRelative(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const units = [
    ['year', 525600],
    ['month', 43200],
    ['week', 10080],
    ['day', 1440],
    ['hour', 60],
    ['minute', 1],
  ];
  for (const [unit, minutes] of units) {
    if (Math.abs(diffMinutes) >= minutes || unit === 'minute') {
      return formatter.format(Math.round(diffMinutes / minutes), unit);
    }
  }
  return 'just now';
}

export function formatQuantity(value, unit) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toLocaleString()} ${String(unit || '').toLowerCase()}`;
}
