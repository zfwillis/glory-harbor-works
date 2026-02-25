import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaInstagram, FaFacebook, FaYoutube, FaUser } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    setOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#15436b] text-[#f7fff5] shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
        
        {/* Logo / Title */}
        <Link to="/" className="flex items-center">
          <img 
            src="/logo.png" 
            alt="Glory Harbor Logo" 
            className="h-20 w-auto"
          />
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-8">
          <li>
            <Link className="hover:text-[#E7A027]" to="/">Home</Link>
          </li>
          <li>
            <Link className="hover:text-[#E7A027]" to="/info">Info</Link>
          </li>
          <li>
            <Link className="hover:text-[#E7A027]" to="/contact">Contact</Link>
          </li>
          <li>
            <Link className="hover:text-[#E7A027]" to="/sermons">Sermons</Link>
          </li>

          {/* Auth Links */}
          {isAuthenticated ? (
            <>
              <li>
                <Link className="hover:text-[#E7A027]" to="/prayer-requests">Prayer Requests</Link>
              </li>
              <li className="flex items-center gap-2">
                <FaUser className="text-sm" />
                <Link to="/profile" className="text-sm hover:text-[#E7A027]">{user?.firstName}</Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#E7A027] text-white rounded hover:bg-[#d89020] transition-colors"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/login"
                  className="px-4 py-2 border border-[#f7fff5] rounded hover:bg-[#f7fff5] hover:text-[#15436b] transition-colors"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#E7A027] text-white rounded hover:bg-[#d89020] transition-colors"
                >
                  Register
                </Link>
              </li>
            </>
          )}

          {/* Social Media */}
          <li className="flex gap-4 ml-4">
            <a href="https://www.instagram.com/stgciusa/" target="_blank" rel="noreferrer" className="hover:text-[#E7A027]">
              <FaInstagram />
            </a>
            <a href="https://www.facebook.com/STGCIUSA/" target="_blank" rel="noreferrer" className="hover:text-[#E7A027]">
              <FaFacebook />
            </a>
            <a href="https://youtube.com/@gloryharbor" target="_blank" rel="noreferrer" className="hover:text-[#E7A027]">
              <FaYoutube />
            </a>
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-2xl hover:text-[#E7A027]"
          onClick={() => setOpen(!open)}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-[#26262a] text-[#f7fff5] px-6 py-6">
          <ul className="flex flex-col gap-6 text-lg">
            <li><Link to="/" onClick={() => setOpen(false)}>Home</Link></li>
            <li><Link to="/info" onClick={() => setOpen(false)}>Info</Link></li>
            <li><Link to="/contact" onClick={() => setOpen(false)}>Contact</Link></li>
            <li><Link to="/sermons" onClick={() => setOpen(false)}>Sermons</Link></li>

            {/* Mobile Auth Links */}
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/prayer-requests" onClick={() => setOpen(false)}>Prayer Requests</Link>
                </li>
                <li className="flex items-center gap-2 pt-4 border-t border-gray-600">
                  <FaUser className="text-sm" />
                  <Link to="/profile" onClick={() => setOpen(false)} className="text-base">{user?.firstName} {user?.lastName}</Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 bg-[#E7A027] text-white rounded hover:bg-[#d89020] transition-colors"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="pt-4 border-t border-gray-600">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full px-4 py-2 border border-[#f7fff5] rounded text-center hover:bg-[#f7fff5] hover:text-[#15436b] transition-colors"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="block w-full px-4 py-2 bg-[#E7A027] text-white rounded text-center hover:bg-[#d89020] transition-colors"
                  >
                    Register
                  </Link>
                </li>
              </>
            )}

            <li className="flex gap-6 pt-4">
              <a href="https://instagram.com" target="_blank" rel="noreferrer">
                <FaInstagram className="hover:text-[#E7A027]" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer">
                <FaFacebook className="hover:text-[#E7A027]" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">
                <FaYoutube className="hover:text-[#E7A027]" />
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
