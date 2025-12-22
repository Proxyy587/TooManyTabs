# Backend Setup Guide

This guide will walk you through setting up the TooManyTabs backend with NeonDB, Drizzle ORM, and Google Auth.

## Prerequisites

- Node.js/Bun installed
- A NeonDB account (sign up at https://neon.tech)
- A Google Cloud project with OAuth 2.0 credentials

## Step 1: Set Up NeonDB

1. Create an account at [NeonDB](https://neon.tech)
2. Create a new project
3. Copy your database connection string (it will look like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)

## Step 2: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Chrome Extension"
6. Add your extension ID (you can find it in `chrome://extensions` after loading the extension)
7. Add authorized JavaScript origins and redirect URIs if needed
8. Copy your Client ID

## Step 3: Install Dependencies

```bash
cd server
bun install
```

## Step 4: Set Up Environment Variables

Create a `.env` file in the `server` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# JWT Secret (generate a random string)
# You can generate one using: openssl rand -base64 32
JWT_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# API Base URL (optional, defaults to http://localhost:3000)
API_BASE_URL=http://localhost:3000
```

## Step 5: Run Database Migrations

Generate and run migrations using Drizzle:

```bash
# Generate migrations
bunx drizzle-kit generate

# Apply migrations (this will create the tables)
bunx drizzle-kit push
```

Alternatively, you can use Drizzle Studio to inspect your database:

```bash
bunx drizzle-kit studio
```

## Step 6: Start the Server

```bash
bun run index.ts
```

The server should start on port 3000.

## Database Schema

The database includes three main tables:

- **users**: Stores user information (Google ID, email, name, picture)
- **sessions**: Stores saved tab sessions (grouped tabs)
- **tabs**: Stores individual tab information (URL, title, favicon)

## API Endpoints

### Authentication
- `POST /auth/google` - Authenticate with Google OAuth

### Tabs (Protected - requires JWT token)
- `POST /api/tabs/save` - Save tabs to backend
- `GET /api/tabs/sessions` - Get all sessions for authenticated user
- `DELETE /api/tabs/sessions/:sessionId` - Delete a session

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Check that your NeonDB project is active
- Ensure SSL mode is set to `require` in the connection string

### Google OAuth Issues
- Verify your Client ID matches the one in `manifest.json`
- Check that the extension ID is added to your OAuth credentials
- Ensure the OAuth consent screen is configured

### JWT Issues
- Make sure `JWT_SECRET` is set and is a secure random string
- Check that tokens are being sent in the Authorization header
