import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "member",
    registrationCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    
    // Only send registrationCode if role is not member
    if (userData.role === "member") {
      delete userData.registrationCode;
    }
    
    const result = await register(userData);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f7fff5] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-4">
          <img src="/blacklogo.webp" alt="Glory Harbor Works logo" className="h-32 w-auto" />
        </div>
        <h2 className="text-3xl font-bold text-[#15436b] mb-6 text-center">
          Join Glory Harbor
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
              placeholder="Re-enter password"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
            >
              <option value="member">Member</option>
              <option value="leader">Leader</option>
              <option value="pastor">Pastor</option>
            </select>
          </div>

          {/* Registration Code - only show for leader/pastor */}
          {(formData.role === "leader" || formData.role === "pastor") && (
            <div>
              <label htmlFor="registrationCode" className="block text-sm font-medium text-gray-700 mb-1">
                Registration Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="registrationCode"
                name="registrationCode"
                value={formData.registrationCode}
                onChange={handleChange}
                required={formData.role !== "member"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
                placeholder="Enter registration code"
              />
              <p className="text-xs text-gray-500 mt-1">
                Contact an administrator for the {formData.role} registration code
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#15436b] text-white py-2 px-4 rounded-lg hover:bg-[#0f2f4d] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-[#15436b] hover:text-[#E7A027] font-semibold">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
