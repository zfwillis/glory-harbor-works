# Glory Harbor Works

Glory Harbor Works is a senior capstone web application for church community management. It includes authentication, profiles, sermons, prayer requests, member meeting scheduling, and pastor-facing scheduling tools such as availability management and meeting approval workflows.

## Tech Stack

- Frontend: React, React Router, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT-based authentication
- Testing: Jest for backend, Vitest for frontend

## Current Features

- User registration and login with role support for `member`, `leader`, and `pastor`
- Profile management, avatar upload, and authenticated password reset
- Sermons hub with upload, edit, delete, comments, and likes
- Prayer request create, view, update, and delete for authenticated users
- Member meeting scheduling, viewing, updating, and cancellation
- Pastor dashboard for availability, pending requests, schedule review, and meeting approval/decline/cancel
- Data persistence and recovery support for NFR3

## Project Structure

```text
client/   React frontend
server/   Express API and MongoDB models/controllers/tests
docs/     Project and iteration documentation
scripts/  Backup and restore utilities
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string for `MONGO_URI`

## Environment Variables

### Server

Create `server/.env` with values similar to:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

### Client

Create `client/.env` if needed:

```env
VITE_API_URL=http://localhost:5000/api
```

## Installation

Install dependencies in each package used by the project:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

## Running the App

From the repo root:

```bash
npm run start:api
npm run start:client
```

Or run the backend directly inside `server/`:

```bash
npm run --prefix server dev
```

And the frontend inside `client/`:

```bash
npm run --prefix client dev
```

## Testing

### Backend

Run all backend tests:

```bash
npm run --prefix server test
```

Run backend coverage:

```bash
npm run --prefix server test:coverage
```

Run a specific backend test file:

```bash
npm run --prefix server test -- server/tests/controllers/appointmentController.test.js
```

### Frontend

Run frontend tests:

```bash
npm run --prefix client test
```

Run frontend coverage:

```bash
npm run --prefix client test:coverage
```

Build the frontend:

```bash
npm run --prefix client build
```

## Health Check

The API exposes:

```text
GET /api/health
```

This reports:
- API status
- database connectivity
- upload storage availability
- uptime

## NFR3 Data Persistence Support

NFR3-related persistence and recovery details are documented in [docs/nfr3-data-persistence.md](docs/nfr3-data-persistence.md).

Useful commands:

```bash
npm run backup:db
npm run restore:db
```

These scripts back up and restore:
- MongoDB collections
- uploaded files in `server/uploads` when present

## Notes

- The backend now waits for a successful MongoDB connection before starting.
- The app uses local file storage for uploaded media and avatars.
- Backups created by the NFR3 scripts are written to `backups/`, which is gitignored.
