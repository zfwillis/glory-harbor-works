# Testing Guide

## Backend Tests (Jest)

### Running Tests

```bash
cd server
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Test Structure

- **tests/models/User.test.js** - Tests for User model
  - Password hashing
  - Password comparison
  - Schema validation
  - Default values

- **tests/controllers/authController.test.js** - Tests for auth controller
  - User registration
  - User login
  - Get current user
  - Logout

- **tests/middleware/auth.test.js** - Tests for auth middleware
  - Token validation
  - Authentication errors

### Coverage

Coverage reports are generated in `server/coverage/` directory.

---

## Frontend Tests (Vitest + React Testing Library)

### Running Tests

```bash
cd GloryHarborWorks
npm test              # Run all tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

### Test Structure

- **tests/context/AuthContext.test.jsx** - Tests for AuthContext
  - Login functionality
  - Registration
  - Logout
  - Session restoration
  - Error handling

- **tests/pages/Login.test.jsx** - Tests for Login page
  - Form rendering
  - Input validation
  - Form submission
  - Error display
  - Loading states

- **tests/pages/Register.test.jsx** - Tests for Register page
  - Form rendering
  - Password matching validation
  - Password length validation
  - Form submission
  - Role selection

- **tests/components/Navbar.test.jsx** - Tests for Navbar
  - Authenticated/unauthenticated states
  - Mobile menu toggle
  - Logout functionality
  - Navigation links

### Test Utils

- **tests/setup.js** - Global test setup with jest-dom matchers and cleanup

---

## Test Coverage

Both backend and frontend tests include:
- ✅ Unit tests for individual functions
- ✅ Component/integration tests
- ✅ Mock data and API calls
- ✅ Error handling
- ✅ Edge cases

## Best Practices

1. **Run tests before committing** to ensure nothing breaks
2. **Keep tests up to date** when modifying features
3. **Aim for >80% coverage** on critical paths
4. **Test user flows** not just individual functions
5. **Mock external dependencies** for consistent tests
