import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-96 bg-cover bg-center" style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=500&fit=crop)',
      }}>
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      </section>

      {/* Upcoming Events Section */}
      <section className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">UPCOMING EVENTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Sunday Service</h3>
              <p className="text-sm">Every Sunday at 10:00 AM</p>
            </div>
            <div className="bg-blue-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Bible Study</h3>
              <p className="text-sm">Wednesdays at 7:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About Us */}
            <div className="text-center">
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-400">Image</span>
              </div>
              <h3 className="text-xl font-bold mb-3">ABOUT US</h3>
              <p className="text-gray-600">Learn about our mission and community at Glory Harbor Works.</p>
            </div>

            {/* Watch Previous Sermons */}
            <div className="text-center">
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-400">Image</span>
              </div>
              <h3 className="text-xl font-bold mb-3">WATCH PREVIOUS SERMONS</h3>
              <p className="text-gray-600">Access our library of inspiring sermons and teachings.</p>
            </div>

            {/* Smart Aim Appointment */}
            <div className="text-center">
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-400">Image</span>
              </div>
              <h3 className="text-xl font-bold mb-3">SMART AIM APPOINTMENT</h3>
              <p className="text-gray-600">Schedule an appointment with our pastoral team.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
