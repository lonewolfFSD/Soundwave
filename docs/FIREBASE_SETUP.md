# Firebase Setup Guide

This guide will walk you through setting up Firebase for the SoundWave music player application.

## Prerequisites

- A Google account
- Node.js and npm/pnpm installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter your project name (e.g., "SoundWave Music Player")
4. Choose your location
5. Click "Create project"

## Step 2: Set Up Authentication

1. In the Firebase Console, go to **Authentication** (under Build)
2. Click **Get started**
3. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

## Step 3: Create Firestore Database

1. Go to **Firestore Database** (under Build)
2. Click **Create database**
3. Choose a location (close to your users)
4. Start in **Production mode**
5. Click **Create**

### Firestore Security Rules

Replace the default security rules with:

```firebase
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own playlists
    match /playlists/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Songs in playlists
    match /playlists/{playlistId}/songs/{document=**} {
      allow read, write: if request.auth.uid == get(/databases/$(database)/documents/playlists/$(playlistId)).data.userId;
    }
  }
}
```

## Step 4: Set Up Cloud Storage

1. Go to **Storage** (under Build)
2. Click **Get started**
3. Choose a location
4. Click **Done**

### Storage Security Rules

Replace the default rules with:

```firebase
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to upload audio files
    match /users/{userId}/audio/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.resource.size < 100 * 1024 * 1024; // 100MB max
    }
  }
}
```

## Step 5: Get Your Firebase Config

1. In the Firebase Console, go to **Project Settings** (gear icon)
2. Under the "General" tab, find your Web API credentials
3. Copy the following values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

## Step 6: Create a Service Account Key (for Backend)

1. In **Project Settings**, go to **Service Accounts** tab
2. Click **Generate new private key**
3. A JSON file will be downloaded
4. Keep this file secure!

## Step 7: Configure Environment Variables

### Frontend (.env)

Create a `.env` file in the project root with:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:3001
```

### Backend (.env)

Create a `.env` file in the `server/` directory with:

```
VITE_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
# OR
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
PORT=3001
```

Or place your `serviceAccountKey.json` file in the `server/` directory.

## Step 8: Test Your Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Start the backend server (in another terminal):
   ```bash
   cd server
   pnpm install
   pnpm start
   ```

4. Visit `http://localhost:5173` and sign up with an email

## Database Structure

The app uses the following Firestore structure:

```
playlists/
  {playlistId}/
    - userId (string)
    - name (string)
    - songCount (number)
    - createdAt (timestamp)
    songs/
      {songId}/
        - title (string)
        - artist (string)
        - duration (number)
        - url (string)
        - addedAt (timestamp)
```

## Troubleshooting

### "Unauthorized" error on signup/login
- Check that Email/Password authentication is enabled
- Verify CORS is configured in your Firebase project

### Songs not saving
- Check Firestore security rules
- Verify user authentication status
- Check browser console for errors

### Storage upload fails
- Check Cloud Storage is enabled
- Verify security rules allow uploads
- Check file size is under 100MB limit

## Deployment

For production deployment:

1. **Frontend**: Deploy to Vercel, Netlify, or similar
2. **Backend**: Deploy to Heroku, Railway, or similar Node.js hosting
3. **Update environment variables** in your hosting platform
4. **Update Firestore rules** to restrict to your domain

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Storage](https://firebase.google.com/docs/storage)
