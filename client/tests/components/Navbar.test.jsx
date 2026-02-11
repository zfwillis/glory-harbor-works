import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../../src/components/Navbar';
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

const renderNavbar = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render navbar with logo', () => {
    renderNavbar();
    expect(screen.getByText(/Glory Harbor/i)).toBeInTheDocument();
  });

  it('should show login and register buttons when not authenticated', () => {
    renderNavbar();
    
    const loginButtons = screen.getAllByText(/Login/i);
    const registerButtons = screen.getAllByText(/Register/i);
    
    expect(loginButtons.length).toBeGreaterThan(0);
    expect(registerButtons.length).toBeGreaterThan(0);
  });

  it('should show user name and logout when authenticated', async () => {
    localStorage.setItem('token', 'token123');
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: '123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      }),
    });

    renderNavbar();

    await screen.findByText(/John/i);
    
    const logoutButtons = screen.getAllByText(/Logout/i);
    expect(logoutButtons.length).toBeGreaterThan(0);
  });

  it('should toggle mobile menu on button click', () => {
    renderNavbar();

    // Mobile menu should not be visible initially
    const mobileLinks = screen.queryAllByText(/Home/i);
    
    // Click hamburger menu (look for the button in mobile view)
    const menuButtons = screen.getAllByRole('button');
    const hamburgerButton = menuButtons.find(btn => btn.querySelector('svg'));
    
    if (hamburgerButton) {
      fireEvent.click(hamburgerButton);
      // Menu should now be visible
      expect(screen.getAllByText(/Home/i).length).toBeGreaterThan(1);
    }
  });

  it('should have navigation links', () => {
    renderNavbar();

    expect(screen.getAllByText(/Home/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Info/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Contact/i).length).toBeGreaterThan(0);
  });

  it('should have social media links', () => {
    const { container } = renderNavbar();

    const links = container.querySelectorAll('a[href*="instagram"]');
    expect(links.length).toBeGreaterThan(0);
    
    const fbLinks = container.querySelectorAll('a[href*="facebook"]');
    expect(fbLinks.length).toBeGreaterThan(0);
    
    const ytLinks = container.querySelectorAll('a[href*="youtube"]');
    expect(ytLinks.length).toBeGreaterThan(0);
  });

  it('should call logout and navigate on logout button click', async () => {
    localStorage.setItem('token', 'token123');
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: '123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      }),
    });

    renderNavbar();

    await screen.findByText(/John/i);

    const logoutButtons = screen.getAllByText(/Logout/i);
    fireEvent.click(logoutButtons[0]);

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
