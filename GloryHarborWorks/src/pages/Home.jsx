import { Link } from 'react-router-dom'
import { FaPlay, FaPhone, FaEnvelope } from 'react-icons/fa'

export default function Home() {
  const sermons = [
    {
      id: 1,
      title: "The Love of Christ",
      pastor: "Pastor John",
      date: "Feb 9, 2025",
      type: "video",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 2,
      title: "Faith in the Storm",
      pastor: "Pastor Sarah",
      date: "Feb 2, 2025",
      type: "video",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 3,
      title: "Grace Abounding",
      pastor: "Pastor Michael",
      date: "Jan 26, 2025",
      type: "video",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section - G1: View Landing Page */}
      <section className="relative h-96 bg-cover bg-center" style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=500&fit=crop)',
      }}>
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4">Glory Harbor Works</h1>
            <p className="text-xl">A Harbor of Hope and Spiritual Growth</p>
          </div>
        </div>
      </section>

      {/* Mission Statement - G1 & G3: View Landing Page & Church Info */}
      <section className="bg-blue-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-blue-900">Our Mission</h2>
          <p className="text-lg text-gray-700 mb-4">
            Glory Harbor Works is committed to spreading the Gospel, building a loving community, 
            and helping individuals discover their purpose in Christ. We welcome all seekers of faith 
            and provide a welcoming space for spiritual growth.
          </p>
          <p className="text-lg text-gray-700">
            Our vision is to be a beacon of hope in our community, transforming lives through God's Word 
            and the power of the Holy Spirit.
          </p>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">UPCOMING EVENTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Sunday Service</h3>
              <p className="text-sm mb-3">Every Sunday at 10:00 AM</p>
              <p className="text-xs">Join us for worship, prayer, and fellowship.</p>
            </div>
            <div className="bg-blue-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Bible Study</h3>
              <p className="text-sm mb-3">Wednesdays at 7:00 PM</p>
              <p className="text-xs">Dive deeper into God's Word with our community.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sermons Section - G2: Stream Sermons */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center text-gray-900">Recent Sermons</h2>
          <p className="text-center text-gray-600 mb-12">Watch and listen to our latest sermons</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {sermons.map((sermon) => (
              <div key={sermon.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition">
                <div className="bg-gray-800 h-48 flex items-center justify-center relative">
                  <iframe
                    width="100%"
                    height="100%"
                    src={sermon.url}
                    title={sermon.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{sermon.title}</h3>
                  <p className="text-sm text-gray-600 mb-1">{sermon.pastor}</p>
                  <p className="text-sm text-gray-500">{sermon.date}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href="https://www.youtube.com/@GloryHarborWorks" target="_blank" rel="noreferrer" 
               className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition">
              View All Sermons on YouTube
            </a>
          </div>
        </div>
      </section>

      {/* Church Info Cards - G3: View Church Info */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">About Glory Harbor Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* History */}
            <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
              <h3 className="text-2xl font-bold mb-3">Our History</h3>
              <p className="text-gray-700">
                Founded in 2015, Glory Harbor Works has grown from a small fellowship 
                to a thriving church community dedicated to spreading Christ's love.
              </p>
            </div>

            {/* What We Believe */}
            <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
              <h3 className="text-2xl font-bold mb-3">What We Believe</h3>
              <p className="text-gray-700">
                We believe in the power of God's Word, the importance of community, 
                and the transformative grace of Jesus Christ in our lives.
              </p>
            </div>

            {/* Community */}
            <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
              <h3 className="text-2xl font-bold mb-3">Our Community</h3>
              <p className="text-gray-700">
                We serve our community through outreach programs, food banks, 
                and support for those in need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section - G5: Contact Church */}
      <section className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Get In Touch</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Phone */}
            <div className="bg-blue-700 p-6 rounded-lg text-center">
              <FaPhone className="text-4xl mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Call Us</h3>
              <p className="text-sm">(410) 555-0123</p>
              <p className="text-xs mt-2 opacity-75">Mon - Fri, 9AM - 5PM</p>
            </div>

            {/* Email */}
            <div className="bg-blue-700 p-6 rounded-lg text-center">
              <FaEnvelope className="text-4xl mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Email Us</h3>
              <p className="text-sm">info@gloryharbor.com</p>
              <p className="text-xs mt-2 opacity-75">We'll reply within 24 hours</p>
            </div>

            {/* Visit */}
            <div className="bg-blue-700 p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">Visit Us</h3>
              <p className="text-sm">123 Harbor Street</p>
              <p className="text-sm">Baltimore, MD 21201</p>
              <p className="text-xs mt-2 opacity-75">Sundays at 10:00 AM</p>
            </div>
          </div>

          <div className="text-center">
            <Link to="/contact" className="inline-block bg-yellow-500 text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition">
              Send us a Message
            </Link>
          </div>
        </div>
      </section>

      {/* Social Media Section - G4: View Social Media */}
      <section className="bg-gray-100 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">Follow Us On Social Media</h2>
          <p className="text-gray-600 mb-8">Stay connected with Glory Harbor Works for daily inspiration and updates</p>
          <div className="flex justify-center gap-8">
            <a href="https://facebook.com/GloryHarborWorks" target="_blank" rel="noreferrer" 
               className="text-3xl text-blue-600 hover:text-blue-800 transition">
              f
            </a>
            <a href="https://instagram.com/GloryHarborWorks" target="_blank" rel="noreferrer"
               className="text-3xl text-pink-600 hover:text-pink-800 transition">
              📷
            </a>
            <a href="https://youtube.com/@GloryHarborWorks" target="_blank" rel="noreferrer"
               className="text-3xl text-red-600 hover:text-red-800 transition">
              ▶️
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
