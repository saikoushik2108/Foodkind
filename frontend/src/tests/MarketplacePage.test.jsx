import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

function renderPage(initialEntries = ['/marketplace']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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
      expect.objectContaining({ page: 1, limit: 12 })
    );
  });

  it('shows a helpful empty state when no surplus food is available', async () => {
    donationApi.list.mockResolvedValue({ items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });

    renderPage();

    expect(await screen.findByText('No surplus food available right now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh listings/i })).toBeInTheDocument();
  });

  it('surfaces API failures instead of rendering an empty marketplace', async () => {
    donationApi.list.mockRejectedValue(Object.assign(new Error('Service unavailable'), { status: 503 }));

    renderPage();

    expect(await screen.findByText('Listings could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();
  });

  it('allows changing sort options to reorder listings', async () => {
    donationApi.list.mockResolvedValue({ items: [listing()], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } });

    renderPage();
    await screen.findByRole('link', { name: 'Canteen lunch surplus' });

    donationApi.list.mockClear();

    const sortSelect = screen.getByLabelText(/sort options/i);
    await userEvent.selectOptions(sortSelect, 'newest');

    await waitFor(() => {
      expect(donationApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'newest', page: 1 })
      );
    });
  });

  it('reloads listings when the refresh button is clicked', async () => {
    donationApi.list.mockResolvedValue({ items: [listing()], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } });

    renderPage();
    await screen.findByRole('link', { name: 'Canteen lunch surplus' });

    donationApi.list.mockClear();

    const refreshBtn = screen.getByRole('button', { name: /refresh$/i });
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      expect(donationApi.list).toHaveBeenCalled();
    });
  });
});
