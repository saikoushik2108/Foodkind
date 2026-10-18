import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MarketplacePage } from '../pages/MarketplacePage.jsx';
import { donationApi } from '../api/resources.js';

// Only the API boundary is mocked; the page, its state and rendering are real.
vi.mock('../api/resources.js', () => ({
  donationApi: { list: vi.fn() },
}));

function listing(overrides = {}) {
  return {
    id: 'd1',
    title: 'Canteen lunch surplus',
    status: 'AVAILABLE',
    foodCategory: 'PREPARED_MEAL',
    dietaryClassification: 'VEG',
    storageRequirement: 'CHILLED',
    quantity: 100,
    availableQuantity: 60,
    reservedQuantity: 40,
    collectedQuantity: 0,
    remainingQuantity: 60,
    unit: 'PORTIONS',
    allergens: [{ name: 'Gluten' }],
    collectionDeadline: new Date(Date.now() + 6 * 3600_000).toISOString(),
    collectionLocation: { type: 'Point', coordinates: [77.5946, 12.9716] },
    donor: { name: 'Campus Canteen' },
    distanceKm: 2.4,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MarketplacePage />
    </MemoryRouter>
  );
}

describe('MarketplacePage', () => {
  beforeEach(() => {
    donationApi.list.mockReset();
  });

  it('loads open listings and shows allocation detail', async () => {
    donationApi.list.mockResolvedValue({
      items: [listing()],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    renderPage();

    expect(await screen.findByRole('link', { name: 'Canteen lunch surplus' })).toBeInTheDocument();
    expect(screen.getByText(/Campus Canteen/)).toBeInTheDocument();
    expect(screen.getByText(/60 portions available/)).toBeInTheDocument();
    expect(screen.getByText(/Contains: Gluten/)).toBeInTheDocument();
    expect(screen.getByText(/2.4 km away/)).toBeInTheDocument();

    expect(donationApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 12, sort: 'deadline' })
    );
  });

  it('shows a helpful empty state when nothing matches', async () => {
    donationApi.list.mockResolvedValue({ items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });

    renderPage();

    expect(await screen.findByText('No listings match your filters')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /post a demand request/i })).toBeInTheDocument();
  });

  it('surfaces API failures instead of rendering an empty marketplace', async () => {
    donationApi.list.mockRejectedValue(Object.assign(new Error('Service unavailable'), { status: 503 }));

    renderPage();

    expect(await screen.findByText('Listings could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();
  });

  it('passes applied filters to the API only after submitting', async () => {
    donationApi.list.mockResolvedValue({ items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });

    renderPage();
    await screen.findByText('No listings match your filters');

    donationApi.list.mockClear();

    await userEvent.selectOptions(screen.getByLabelText(/food category/i), 'BAKED_GOODS');
    await userEvent.type(screen.getByLabelText(/city contains/i), 'Bengaluru');

    // Typing alone must not refetch — the form is explicit.
    expect(donationApi.list).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(donationApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ foodCategory: 'BAKED_GOODS', city: 'Bengaluru', page: 1 })
      );
    });
  });

  it('marks the self-pickup filter in the API request', async () => {
    donationApi.list.mockResolvedValue({ items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });

    renderPage();
    await screen.findByText('No listings match your filters');
    donationApi.list.mockClear();

    const form = screen.getByRole('button', { name: /apply filters/i }).closest('form');
    await userEvent.click(within(form).getByLabelText(/only listings we can collect ourselves/i));
    await userEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(donationApi.list).toHaveBeenCalledWith(expect.objectContaining({ selfPickupOnly: 'true' }));
    });
  });

  it('reports the number of active filters', async () => {
    donationApi.list.mockResolvedValue({ items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });

    renderPage();
    await screen.findByText('No listings match your filters');

    await userEvent.selectOptions(screen.getByLabelText(/^dietary$/i), 'VEGAN');
    await userEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(await screen.findByText(/1 filter active/)).toBeInTheDocument();
  });
});
