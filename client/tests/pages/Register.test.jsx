import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../src/pages/Register';
import { AuthProvider } from '../../src/context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

global.fetch = vi.fn();

const renderRegister = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render registration form', () => {
    renderRegister();

    expect(screen.getByText(/Join Glory Harbor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
  });

  it('should show error if passwords do not match', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password456' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should show error if password is too short', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: '12345' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it('should register successfully with valid data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'token123',
        user: {
          id: '123',
          email: 'new@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      }),
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display error message on registration failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'User already exists' }),
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText(/User already exists/i)).toBeInTheDocument();
    });
  });

  it('should have link to login page', () => {
    renderRegister();

    const loginLink = screen.getByText(/Login here/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should allow selecting different roles', () => {
    renderRegister();

    const roleSelect = screen.getByLabelText(/Role/i);
    
    fireEvent.change(roleSelect, { target: { value: 'leader' } });
    expect(roleSelect.value).toBe('leader');

    fireEvent.change(roleSelect, { target: { value: 'pastor' } });
    expect(roleSelect.value).toBe('pastor');
  });

  it('should show registration code field for leader role', () => {
    renderRegister();

    const roleSelect = screen.getByLabelText(/Role/i);
    
    // Should not show code field initially
    expect(screen.queryByLabelText(/Registration Code/i)).not.toBeInTheDocument();

    // Change to leader
    fireEvent.change(roleSelect, { target: { value: 'leader' } });
    
    // Should now show code field
    expect(screen.getByLabelText(/Registration Code/i)).toBeInTheDocument();
  });

  it('should show registration code field for pastor role', () => {
    renderRegister();

    const roleSelect = screen.getByLabelText(/Role/i);
    
    fireEvent.change(roleSelect, { target: { value: 'pastor' } });
    
    expect(screen.getByLabelText(/Registration Code/i)).toBeInTheDocument();
  });
});
