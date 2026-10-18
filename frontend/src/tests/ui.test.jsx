import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AllocationMeter,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Pagination,
  StatusBadge,
  formatDate,
  formatQuantity,
  formatRelative,
  humanize,
} from '../components/ui.jsx';

describe('formatters', () => {
  it('humanizes enum values', () => {
    expect(humanize('PARTIALLY_RESERVED')).toBe('Partially reserved');
    expect(humanize('PICKUP_ASSIGNED')).toBe('Pickup assigned');
    expect(humanize(null)).toBe('—');
  });

  it('formats quantities with their unit', () => {
    expect(formatQuantity(120, 'PORTIONS')).toBe('120 portions');
    expect(formatQuantity(7.5, 'KILOGRAMS')).toBe('7.5 kilograms');
    expect(formatQuantity(null, 'PORTIONS')).toBe('—');
  });

  it('formats dates and handles invalid input without throwing', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('2026-01-15T10:30:00.000Z')).toContain('2026');
  });

  it('formats relative times for past and future timestamps', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000).toISOString();
    const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(formatRelative(twoHoursAgo)).toMatch(/hour|ago/i);
    expect(formatRelative(inThreeDays)).toMatch(/day/i);
    expect(formatRelative(undefined)).toBe('—');
  });
});

describe('StatusBadge', () => {
  it('renders a humanised label', () => {
    render(<StatusBadge status="PARTIALLY_RESERVED" />);
    expect(screen.getByText('Partially reserved')).toBeInTheDocument();
  });

  it('renders a placeholder when no status is given', () => {
    render(<StatusBadge status={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('accepts an explicit label override', () => {
    render(<StatusBadge status="OPEN" label="Needs attention" />);
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
  });
});

describe('AllocationMeter', () => {
  it('describes the allocation in text for assistive technology', () => {
    render(<AllocationMeter quantity={100} available={60} reserved={40} collected={0} />);
    expect(
      screen.getByRole('img', { name: '60 of 100 available, 40 reserved, 0 collected' })
    ).toBeInTheDocument();
    expect(screen.getByText(/60 available · 40 reserved · 0 collected/)).toBeInTheDocument();
  });

  it('never renders negative widths when data is inconsistent', () => {
    const { container } = render(<AllocationMeter quantity={0} available={-5} reserved={0} collected={0} />);
    const segment = container.querySelector('.meter-seg-available');
    expect(segment.style.width).toBe('0%');
  });
});

describe('Button', () => {
  it('is disabled and marked busy while loading', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('invokes its click handler', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Publish</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('shows the title, description, and action', () => {
    render(
      <EmptyState
        title="No listings yet"
        description="Publish surplus to get started."
        action={<Button>Publish surplus</Button>}
      />
    );
    expect(screen.getByRole('heading', { name: 'No listings yet' })).toBeInTheDocument();
    expect(screen.getByText('Publish surplus to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish surplus' })).toBeInTheDocument();
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'title', header: 'Listing' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  it('renders rows and their custom cells', () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: 'd1', title: 'Canteen surplus', status: 'AVAILABLE' }]}
        caption="Listings"
      />
    );
    expect(screen.getByRole('table', { name: 'Listings' })).toBeInTheDocument();
    expect(screen.getByText('Canteen surplus')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('falls back to the empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} empty={<EmptyState title="Nothing here" />} />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('reports the visible range and disables Previous on the first page', () => {
    render(<Pagination page={1} totalPages={3} total={25} limit={10} onPageChange={() => {}} />);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('requests the next page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} total={25} limit={10} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

describe('ConfirmDialog', () => {
  it('renders only when open and wires both buttons', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmDialog open={false} onCancel={onCancel} onConfirm={onConfirm} title="Cancel listing?">
        Body
      </ConfirmDialog>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <ConfirmDialog open onCancel={onCancel} onConfirm={onConfirm} title="Cancel listing?" confirmLabel="Cancel listing">
        Body
      </ConfirmDialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel listing' }));
    expect(onConfirm).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('applies the requested variant class', () => {
    const { container } = render(<Badge variant="warning">Held</Badge>);
    expect(container.querySelector('.badge-warning')).toBeTruthy();
  });
});
