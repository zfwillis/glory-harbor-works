import { useState } from 'react'
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock } from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })

  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit')

      setSubmitted(true)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (err) {
      console.error('Contact submit error:', err)
      setError(err.message || 'Error submitting form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white">
      {/* Page Header */}
      <section className="bg-[#15436b] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg">We'd love to hear from you. Get in touch with Glory Harbor Works today.</p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Phone */}
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaPhone className="text-2xl text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Call Us</h3>
              <p className="text-gray-600">(667) 310-1970</p>
            </div>

            {/* Email */}
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaEnvelope className="text-2xl text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email</h3>
              <p className="text-gray-600">stgciglory@gmail.com</p>
            </div>

            {/* Address */}
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaMapMarkerAlt className="text-2xl text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Visit</h3>
              <p className="text-gray-600">9004 Harford Road<br />Parkville, MD 21234</p>
            </div>

            {/* Hours */}
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaClock className="text-2xl text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Hours</h3>
              <p className="text-gray-600">Sun: 10:00 AM<br />Tues: 7:00 PM - 9:00 PM<br />Fri: 7:00 PM - 9:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Send Message</h2>

          {submitted && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              Thank you for reaching out! We'll get back to you shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
            {/* Name */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="Your email"
              />
            </div>

            {/* Phone */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="Your phone number"
              />
            </div>

            {/* Subject */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Subject *</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="What is this about?"
              />
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Message *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="Your message..."
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#15436b] text-white py-3.5 font-semibold uppercase tracking-wide text-sm border-2 border-[#15436b] hover:bg-[#E7A027] hover:border-[#E7A027] transition-all duration-300"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">How Can We Help?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Questions About Worship</h3>
              <p className="text-gray-700">
                Have questions about our services, beliefs, or want to learn more about our church? 
                Feel free to reach out!
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Prayer Requests</h3>
              <p className="text-gray-700">
                We believe in the power of prayer. Submit your prayer request and our prayer team 
                will lift you up.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Visit Us</h3>
              <p className="text-gray-700">
                Want to visit Glory Harbor Works in person? We'd love to welcome you to our community 
                on Sunday mornings!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
