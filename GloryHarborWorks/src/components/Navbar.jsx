import { useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaTimes, FaInstagram, FaFacebook, FaYoutube } from "react-icons/fa";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#15436b] text-[#f7fff5] shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo / Title */}
        <Link to="/" className="text-2xl font-bold tracking-wide">
          Glory Harbor
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

          {/* Social Media */}
          <li className="flex gap-4 ml-4">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-[#E7A027]">
              <FaInstagram />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-[#E7A027]">
              <FaFacebook />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-[#E7A027]">
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
