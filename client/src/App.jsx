import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Info from './pages/Info'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import SermonsHub from './pages/SermonsHub'
import PrayerRequests from './pages/PrayerRequests'
import AdminDash from './pages/AdminDash'
import TeacherDash from './pages/TeacherDash'
import PrayerTeamDash from './pages/PrayerTeamDash'
import PastorDash from './pages/PastorDash'
import Meetings from './pages/Meetings'
import ContactSubmissions from './pages/ContactSubmissions'
import MyChildren from './pages/MyChildren'
import ChildMode from './pages/ChildMode'
import ChildModeLock from './components/ChildModeLock'
import { useLocation } from 'react-router-dom'

function AppShell() {
  const location = useLocation()
  const isChildModeRoute = location.pathname.startsWith('/child-mode')

  return (
    <ChildModeLock>
      <div className="flex flex-col min-h-screen">
        {!isChildModeRoute && <Navbar />}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/info" element={<Info />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/sermons" element={<SermonsHub />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prayer-requests"
              element={
                <ProtectedRoute>
                  <PrayerRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDash />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher-dashboard"
              element={
                <ProtectedRoute roles={["teacher", "admin", "pastor", "leader"]}>
                  <TeacherDash />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prayer-team-dashboard"
              element={
                <ProtectedRoute roles={["prayer_team", "admin", "pastor", "leader"]}>
                  <PrayerTeamDash />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pastor-dashboard"
              element={
                <ProtectedRoute roles={["pastor", "leader"]}>
                  <PastorDash />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contact-submissions"
              element={
                <ProtectedRoute roles={["pastor", "admin", "leader"]}>
                  <ContactSubmissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings"
              element={
                <ProtectedRoute>
                  <Meetings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-children"
              element={
                <ProtectedRoute>
                  <MyChildren />
                </ProtectedRoute>
              }
            />
            <Route
              path="/child-mode/:childId"
              element={
                <ProtectedRoute>
                  <ChildMode />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        {!isChildModeRoute && <Footer />}
      </div>
    </ChildModeLock>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  )
}

export default App
