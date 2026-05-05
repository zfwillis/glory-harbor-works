# Glory Harbor Works

Glory Harbor Works is a senior capstone web application built for STGCI-Glory Harbor church. It centralizes church community management into one accessible platform — covering sermon streaming, prayer requests, pastoral scheduling, children's ministry, and role-based access for all member types.

## Tech Stack

- **Frontend:** React, React Router, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Auth:** JWT-based authentication
- **Scheduling:** Calendly API integration
- **Testing:** Jest (backend), Vitest + React Testing Library (frontend)

## Features

### Guest Access
- View landing page and church info
- Stream audio and video sermons
- View social media links
- Contact the church

### Members
- Register, log in, log out, and reset password
- View and update profile, upload a profile picture
- Full sermon hub: stream, search by speaker/topic/series, like, comment, and edit/delete own comments
- Submit prayer requests publicly or anonymously; view, edit, and delete own requests
- Schedule, view, reschedule, and cancel pastoral appointments
- Receive push notifications and pastoral appointment reminders
- Register and manage child accounts linked to their profile

### Pastors
- Set and manage availability
- Approve, decline, and cancel meeting requests
- View full schedule
- View and manage incoming prayer requests; mark requests as complete

### Teachers
- Create and update weekly lessons and memory verses
- Create and manage quizzes
- Review quiz results and monitor each child's progress

### Children
- View weekly lessons and memory verses
- Complete quizzes after lessons
- Track their own learning progress

### Administrators
- Upload, edit, and delete audio and video sermons
- Assign and change member roles
- Deactivate unused accounts
- Send announcements and notifications

## Roles

The system supports five roles with distinct permissions:

| Role | Description |
|---|---|
| `member` | Standard church member |
| `pastor` | Manages meetings and prayer requests |
| `prayer_team` | Views and marks prayer requests as complete |
| `teacher` | Manages children's ministry lessons and quizzes |
| `admin` | Full administrative access; assigns roles |

Roles are assigned by an admin after registration. Registration no longer requires an invite code.

## Project Structure

```text
client/     React frontend
server/     Express API, MongoDB models, controllers, routes, and tests
docs/       Project and iteration documentation
scripts/    Backup and restore utilities
```

## Prerequisites

- Node.js 18+
- npm
- A MongoDB connection string for `MONGO_URI`

## Environment Variables

### Server

Create `server/.env`:

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

Install dependencies for the root, server, and client:

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

Or run each side independently:

```bash
# Backend (inside server/)
npm run --prefix server dev

# Frontend (inside client/)
npm run --prefix client dev
```

## Testing

### Backend

```bash
# Run all backend tests
npm run --prefix server test

# Run with coverage
npm run --prefix server test:coverage

# Run a specific test file
npm run --prefix server test -- server/tests/controllers/appointmentController.test.js
```

### Frontend

```bash
# Run all frontend tests
npm run --prefix client test

# Run with coverage
npm run --prefix client test:coverage

# Build the frontend
npm run --prefix client build
```

Coverage targets 75% across statements, branches, functions, and lines. No code is released unless all tests pass at or above this threshold.

## Health Check

```text
GET /api/health
```

Returns:
- API status
- Database connectivity
- Upload storage availability
- Server uptime

## NFR3 Data Persistence

The backend verifies a successful MongoDB connection before starting. It includes health monitoring, fast startup recovery, and backup/restore scripts for collections and uploaded media.

```bash
npm run backup:db
npm run restore:db
```

These scripts back up and restore MongoDB collections and any uploaded files in `server/uploads/`. Backups are written to `backups/`, which is gitignored.

Full details are documented in [docs/nfr3-data-persistence.md](docs/nfr3-data-persistence.md).

## Notes

- Media uploads and avatars are stored locally under `server/uploads/`.
- Calendly handles meeting booking and sends automated confirmations to members.
- The database uses camelCase for JavaScript code and lowercase singular names for collections.
- Coding conventions: camelCase for all JS, lowercase singular names for MongoDB collections.
