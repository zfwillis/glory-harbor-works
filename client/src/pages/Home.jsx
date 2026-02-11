import { Link } from 'react-router-dom'
import { FaPlay, FaPhone, FaEnvelope, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useState, useEffect } from 'react'

export default function Home() {
  // Carousel images - add your images to the public folder
  const heroImages = [
    '/hero-image.JPG',
    '/hero-image-2.jpg',
    '/hero-image-3.jpg',
  ]

  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [heroImages.length])

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)
  }

  const sermons = [
    {
      id: 1,
      title: "Benefits of Praying In Tongues (Part 2)",
      pastor: "Pastor Victor Akinde",
      date: "July 10, 2025",
      type: "video",
      url: "https://www.youtube.com/embed/kFdr4v678dw"
    },
    {
      id: 2,
      title: "Intimacy With The Holy Spirit",
      pastor: "Pastor Victor Akinde",
      date: "July 10, 2025",
      type: "video",
      url: "https://www.youtube.com/embed/cRQYRSn0nq8"
    },
    {
      id: 3,
      title: "Exercising Power and Authority Over Unclean Spirits",
      pastor: "Pastor Victor Akinde",
      date: "July 10, 2025",
      type: "video",
      url: "https://www.youtube.com/embed/CvHQooGfIhw"
    }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section - G1: View Landing Page */}
      <section className="relative h-96 overflow-hidden">
        {/* Carousel Images */}
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 75%',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">Welcome to Glory Harbor</h1>
              </div>
            </div>
          </div>
        ))}

        {/* Previous Button */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full transition z-10"
          aria-label="Previous slide"
        >
          <FaChevronLeft />
        </button>

        {/* Next Button */}
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full transition z-10"
          aria-label="Next slide"
        >
          <FaChevronRight />
        </button>

        {/* Dots Navigation */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition ${
                index === currentSlide ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Mission Statement - G1 & G3: View Landing Page & Church Info */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-[#15436b]">Our Mission</h2>
          <p className="text-lg text-gray-700 mb-4">
            Strong Tower Glorious Church International, Glory Harbor campus is a Pentecostal denomination located in Parkville, MD.
We are sent to take the gospel of Jesus Christ throughout the whole world with supernatural demonstration of his power through teaching, preaching and discipleship.
          </p>
          <p className="text-lg text-gray-700">
            Our vision is to be a beacon of hope in our community, transforming lives through God's Word 
            and the power of the Holy Spirit.
          </p>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="bg-[#15436b] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">UPCOMING EVENTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 p-6">
              <h3 className="text-xl font-semibold mb-2">Sunday Service</h3>
              <p className="text-sm mb-3">Every Sunday at 10:00 AM</p>
              <p className="text-xs opacity-90">Join us for worship, prayer, and fellowship.</p>
            </div>
            <div className="bg-white/10 p-6">
              <h3 className="text-xl font-semibold mb-2">Bible Study</h3>
              <p className="text-sm mb-3">Tuesdays at 7:00 PM</p>
              <p className="text-xs opacity-90">Dive deeper into God's Word with our community.</p>
            </div>
            <div className="bg-white/10 p-6">
              <h3 className="text-xl font-semibold mb-2">Prayer Meeting</h3>
              <p className="text-sm mb-3">Fridays at 7:00 PM</p>
              <p className="text-xs opacity-90">Join us for a time of prayer and spiritual growth.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sermons Section - G2: Stream Sermons */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center text-[#15436b]">Past Sermons</h2>
          <p className="text-center text-gray-600 mb-12">Watch and listen to previous sermons</p>
          
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
            <a href="https://www.youtube.com/@gloryharbor" target="_blank" rel="noreferrer" 
               className="inline-block bg-[#15436b] text-white px-8 py-3 rounded-lg hover:bg-[#E7A027] hover:text-white transition">
              View All Sermons on YouTube
            </a>
          </div>
        </div>
      </section>

      {/* Church Info Cards - G3: View Church Info */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center text-[#15436b]">About Glory Harbor</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* History */}
            <div className="border-l-4 border-[#E7A027] bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 overflow-hidden">
              <img 
                src="/history-image.jpg" 
                alt="Our History" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-[#15436b]">Our History</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Founded in 2020, Glory Harbor is a thriving church community dedicated to spreading Christ's love.
                </p>
                <a href="#history" className="text-[#E7A027] font-semibold hover:text-[#15436b] transition">
                  Learn More →
                </a>
              </div>
            </div>

            {/* What We Believe */}
            <div className="border-l-4 border-[#E7A027] bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 overflow-hidden">
              <img 
                src="/beliefs-image.jpg" 
                alt="What We Believe" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-[#15436b]">What We Believe</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We believe in the power of God's Word, the importance of community, 
                  and the transformative grace of Jesus Christ in our lives.
                </p>
                <a href="#beliefs" className="text-[#E7A027] font-semibold hover:text-[#15436b] transition">
                  Learn More →
                </a>
              </div>
            </div>

            {/* Community */}
            <div className="border-l-4 border-[#E7A027] bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 overflow-hidden">
              <img 
                src="/community-image.jpg" 
                alt="Our Community" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-[#15436b]">Our Community</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We are a loving family that genuinely cares for one another and our community. 
                  Together, we support each other in faith and extend that love to those around us.
                </p>
                <a href="#community" className="text-[#E7A027] font-semibold hover:text-[#15436b] transition">
                  Learn More →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section - G5: Contact Church */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center text-[#26262a]">Contact Us</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Email */}
            <div className="bg-gradient-to-br from-[#15436b] to-[#15436b]/80 p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center">
              <div className="bg-white/95 p-4 rounded-lg w-full text-center">
                <h3 className="text-lg font-semibold mb-2 text-[#15436b]">Email</h3>
                <p className="text-gray-700">stgciglory@gmail.com</p>
              </div>
            </div>

            {/* Visit */}
            <div className="bg-gradient-to-br from-[#15436b] to-[#15436b]/80 p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center">
              <div className="bg-white/95 p-4 rounded-lg w-full text-center">
                <h3 className="text-lg font-semibold mb-2 text-[#15436b]">Visit</h3>
                <p className="text-gray-700">9004 Harford Road</p>
                <p className="text-gray-700">Parkville, MD 21234</p>
                <p className="text-sm mt-3 text-gray-600">Sundays at 10:00 AM</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link to="/contact" className="inline-block bg-[#15436b] text-white px-10 py-3.5 font-semibold uppercase tracking-wide text-sm border-2 border-[#15436b] hover:bg-[#E7A027] hover:border-[#E7A027] transition-all duration-300">
              Send Message
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
