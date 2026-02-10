import { FaInstagram, FaFacebook, FaYoutube } from 'react-icons/fa'

const Footer = () => {
  return (
    <footer className="bg-[#15436b] text-white py-12 mt-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-3">Glory Harbor Works</h3>
            <p className="text-sm opacity-75">
              A welcoming community devoted to spreading the Gospel and spiritual growth.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-3">Quick Links</h3>
            <ul className="text-sm space-y-2">
              <li><a href="/" className="opacity-75 hover:opacity-100 transition">Home</a></li>
              <li><a href="/contact" className="opacity-75 hover:opacity-100 transition">Contact</a></li>
              <li><a href="#sermons" className="opacity-75 hover:opacity-100 transition">Sermons</a></li>
              <li><a href="#events" className="opacity-75 hover:opacity-100 transition">Events</a></li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-bold mb-3">Follow Us</h3>
            <div className="flex gap-4 text-xl">
              <a href="https://facebook.com/GloryHarborWorks" target="_blank" rel="noreferrer" 
                 className="hover:text-[#E7A027] transition">
                <FaFacebook />
              </a>
              <a href="https://instagram.com/GloryHarborWorks" target="_blank" rel="noreferrer"
                 className="hover:text-[#E7A027] transition">
                <FaInstagram />
              </a>
              <a href="https://youtube.com/@GloryHarborWorks" target="_blank" rel="noreferrer"
                 className="hover:text-[#E7A027] transition">
                <FaYoutube />
              </a>
            </div>
          </div>
        </div>

        <hr className="border-opacity-20 mb-6" />

        <div className="text-center text-sm opacity-75">
          <p>© {new Date().getFullYear()} Glory Harbor Works. All rights reserved.</p>
          <p className="mt-2">Contact: info@gloryharbor.com | (410) 555-0123</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
