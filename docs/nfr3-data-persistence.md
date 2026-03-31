# NFR3 Data Persistence

This project now includes baseline data persistence and recovery tooling for NFR3.

## What Is Covered

- MongoDB is the system of record for users, prayers, sermons, and appointments.
- The API now waits for a successful MongoDB connection before starting.
- `/api/health` reports database connectivity and uploaded-file storage status.
- Repo-local backup and restore scripts can export and recover both MongoDB data and files in `server/uploads`.

## Health Verification

Run the API, then check:

```bash
http://localhost:5000/api/health
```

Expected result:
- `status: "ok"` when MongoDB is connected
- `database.status: "up"`
- `storage.uploadsStatus: "available"` when the uploads directory exists

If MongoDB is unavailable at startup, the API exits instead of accepting requests in a broken state.

## Backup

Create a backup with:

```bash
npm run backup:db
```

This writes a timestamped folder under `backups/` containing:
- one JSON file per MongoDB collection
- `metadata.json`
- a copy of `server/uploads` when uploaded files exist

## Restore

Restore the latest backup:

```bash
npm run restore:db
```

Restore a specific backup:

```bash
npm run restore:db -- --dir backups/<timestamp>
```

Replace existing database contents and uploaded files during restore:

```bash
npm run restore:db -- --drop
```

## Restart Verification Procedure

Use this sequence as evidence for NFR3:

1. Create or update a user record, prayer request, sermon, meeting, or pastor availability.
2. Stop the backend server.
3. Start the backend server again.
4. Confirm `/api/health` returns `status: "ok"`.
5. Log back in and verify the previously saved data still appears.

## Current Boundaries

This improves persistence and recoverability, but it is not full enterprise disaster recovery. The following are still operational concerns rather than app code features:

- off-machine backup storage
- scheduled automated backups
- replica sets / database failover
- monitoring and alerting outside the app
