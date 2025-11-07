import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TicketCreatePage from '../../pages/tickets/TicketCreatePage';
import * as api from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  ticketsApi: {
    create: vi.fn(),
  },
  propertiesApi: {
    list: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TicketCreatePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock properties list
    vi.mocked(api.propertiesApi.list).mockResolvedValue([
      { id: '1', address1: '123 Main St', city: 'London', postcode: 'SW1A 1AA' },
      { id: '2', address1: '456 Park Ave', city: 'Manchester', postcode: 'M1 1AA' },
    ]);
  });

  const renderTicketCreatePage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TicketCreatePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders the ticket creation form', async () => {
    renderTicketCreatePage();
    
    expect(screen.getByRole('heading', { name: /report maintenance issue/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/issue title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit ticket/i })).toBeInTheDocument();
  });

  it('loads and displays properties in dropdown', async () => {
    renderTicketCreatePage();
    
    await waitFor(() => {
      expect(screen.getByLabelText(/property/i)).toBeInTheDocument();
    });

    const propertySelect = screen.getByLabelText(/property/i);
    expect(propertySelect).toHaveValue('');
    expect(screen.getByText(/123 Main St/i)).toBeInTheDocument();
    expect(screen.getByText(/456 Park Ave/i)).toBeInTheDocument();
  });

  it('renders required field indicators', async () => {
    renderTicketCreatePage();
    
    // Check that required fields are marked
    expect(screen.getByText(/issue title/i).parentElement).toHaveTextContent('*');
    expect(screen.getByText(/description/i).parentElement).toHaveTextContent('*');
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockTicket = { id: 'ticket-1', title: 'Leaking tap', status: 'OPEN' };
    vi.mocked(api.ticketsApi.create).mockResolvedValueOnce(mockTicket);
    
    renderTicketCreatePage();
    
    // Wait for properties to load
    await waitFor(() => {
      expect(screen.getByLabelText(/property/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/issue title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const prioritySelect = screen.getByLabelText(/priority/i);
    const propertySelect = screen.getByLabelText(/property/i);
    const submitButton = screen.getByRole('button', { name: /submit ticket/i });
    
    await user.type(titleInput, 'Leaking kitchen tap');
    await user.type(descriptionInput, 'The tap in the kitchen is leaking water');
    await user.selectOptions(prioritySelect, 'HIGH');
    await user.selectOptions(propertySelect, '1');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(api.ticketsApi.create).toHaveBeenCalledWith({
        propertyId: '1',
        title: 'Leaking kitchen tap',
        description: 'The tap in the kitchen is leaking water',
        priority: 'HIGH',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/tickets');
    });
  });

  it('submits form without property selection', async () => {
    const user = userEvent.setup();
    const mockTicket = { id: 'ticket-1', title: 'General issue', status: 'OPEN' };
    vi.mocked(api.ticketsApi.create).mockResolvedValueOnce(mockTicket);
    
    renderTicketCreatePage();
    
    const titleInput = screen.getByLabelText(/issue title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit ticket/i });
    
    await user.type(titleInput, 'General issue');
    await user.type(descriptionInput, 'This is a general maintenance issue');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(api.ticketsApi.create).toHaveBeenCalledWith({
        propertyId: undefined,
        title: 'General issue',
        description: 'This is a general maintenance issue',
        priority: 'MEDIUM',
      });
    });
  });

  it('displays error message on submission failure', async () => {
    const user = userEvent.setup();
    vi.mocked(api.ticketsApi.create).mockRejectedValueOnce(new Error('Failed to create ticket'));
    
    renderTicketCreatePage();
    
    const titleInput = screen.getByLabelText(/issue title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit ticket/i });
    
    await user.type(titleInput, 'Test issue');
    await user.type(descriptionInput, 'Test description');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create ticket/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    vi.mocked(api.ticketsApi.create).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderTicketCreatePage();
    
    const titleInput = screen.getByLabelText(/issue title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /submit ticket/i });
    
    await user.type(titleInput, 'Test issue');
    await user.type(descriptionInput, 'Test description');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });
  });

  it('navigates back when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderTicketCreatePage();
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/tickets');
  });
});
