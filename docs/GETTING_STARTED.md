# SoundWave - Getting Started Guide

Welcome to SoundWave! This guide will help you set up and run the application locally.

## What is SoundWave?

SoundWave is a modern music player application that lets you:
- Create and manage music playlists
- Upload and play your own audio files
- Control playback with intuitive controls
- Organize your music with real-time synchronization

## System Requirements

- **Node.js**: 18.0.0 or higher
- **npm/pnpm**: Latest version
- **Modern Browser**: Chrome, Firefox, Safari, or Edge
- **Internet Connection**: For Firebase and authentication

## Step 1: Clone and Install

### Clone the Repository

```bash
git clone <your-repo-url>
cd soundwave
```

### Install Dependencies

Using pnpm (recommended):
```bash
pnpm install
```

Or using npm:
```bash
npm install
```

### Install Server Dependencies

```bash
cd server
pnpm install
cd ..
```

## Step 2: Set Up Firebase

### Quick Setup

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Note these values from Project Settings:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### Create `.env` File

In the project root, create a `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` with your Firebase values:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:3001
```

For detailed Firebase setup, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

## Step 3: Set Up Backend

### Create Server .env File

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```
VITE_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
PORT=3001
```

For server setup details, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md#step-6-create-a-service-account-key-for-backend)

## Step 4: Run the Application

### Terminal 1: Start Frontend Development Server

```bash
pnpm dev
```

This will:
- Start Vite dev server at `http://localhost:5173`
- Enable hot module replacement (HMR)
- Open your browser automatically

### Terminal 2: Start Backend Server

```bash
cd server
pnpm start
```

This will:
- Start the Node.js API server at `http://localhost:3001`
- Show logs for all API requests

## Step 5: Create Your Account

1. Open `http://localhost:5173` in your browser
2. Click "Sign up"
3. Enter your email and create a password
4. You're ready to use SoundWave!

## Key Features to Try

### Create a Playlist

1. Click "Create Your First Playlist" on the dashboard
2. Enter a playlist name
3. Click "Create Playlist"
4. Your new playlist appears in the sidebar

### Add Songs

1. Select a playlist from the sidebar
2. Click "Add Songs"
3. Upload audio files (MP3, WAV, OGG, M4A, FLAC)
4. Wait for upload to complete

### Play Music

1. Double-click a song in the list or click the play icon
2. Use the player at the bottom to control playback
3. Adjust volume with the volume slider
4. Skip between songs with the arrow buttons

### Manage Playlists

- Click on a playlist to view songs
- Delete songs with the trash icon
- Create multiple playlists for different moods

## Project Structure

```
soundwave/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── context/           # State management
│   ├── pages/             # Page components
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── server/                # Node.js backend
│   ├── index.js           # Main server file
│   ├── firebaseAdmin.js   # Firebase setup
│   ├── handlers.js        # API route handlers
│   └── package.json       # Server dependencies
├── docs/                  # Documentation
│   ├── FIREBASE_SETUP.md  # Firebase configuration
│   └── DEPLOYMENT.md      # Deployment guide
└── README.md              # Project overview
```

## Available Commands

### Frontend Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Server Commands

```bash
# Start server
pnpm start

# Start with watch mode (development)
pnpm dev
```

## Troubleshooting

### "Firebase configuration error"

**Solution**: Check your `.env` file has all required Firebase values

```bash
# Verify .env file
cat .env | grep VITE_FIREBASE
```

### "Cannot connect to API"

**Solution**: Make sure backend is running on port 3001

```bash
# Check if port 3001 is in use
lsof -i :3001

# Start backend server
cd server && pnpm start
```

### "Songs won't upload"

**Causes & Solutions**:
1. **Firebase Storage not enabled**: Enable in Firebase Console
2. **File too large**: Max size is 100MB
3. **Wrong format**: Use MP3, WAV, OGG, M4A, or FLAC
4. **Firestore rules**: Check security rules allow writes

### "Auth errors"

**Solution**: Verify:
1. Email/Password auth is enabled in Firebase
2. Service account key is correct (for backend)
3. `.env` files have correct values

## Common Issues & Fixes

### Port Already in Use

```bash
# Kill process on port 3001
kill -9 $(lsof -t -i :3001)

# Or use different port
PORT=3002 pnpm start
```

### Dependencies Not Installing

```bash
# Clear pnpm cache
pnpm store prune

# Remove lock file and reinstall
rm pnpm-lock.yaml
pnpm install
```

### Hot Module Replacement (HMR) Not Working

```bash
# Ensure you're using http://localhost:5173
# Not 127.0.0.1:5173
```

## Next Steps

1. **Read the full README**: [README.md](../README.md)
2. **Learn about Firebase**: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
3. **Plan deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Customize the app**: Modify components in `src/`

## Development Tips

### Using Browser DevTools

1. **React DevTools**: Install browser extension
2. **Inspect Elements**: Right-click → Inspect
3. **Console Logs**: Check `console.log()` output

### Common Development Tasks

```bash
# Format code
pnpm prettier

# Check types
pnpm tsc --noEmit

# Run linter
pnpm lint
```

### Hot Reloading

Changes to files are automatically reflected:
- `.tsx` files: Component updates
- `.css` files: Style changes
- No page refresh needed!

## Getting Help

1. **Check the docs**: `./docs/` folder
2. **Review Firebase docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
3. **Check browser console**: Look for error messages
4. **Review server logs**: Check terminal output

## Performance Tips

- Use Chrome DevTools Performance tab to profile
- Check Network tab to monitor API calls
- Use React DevTools Profiler to find slow components

## Security Notes

- Never commit `.env` files
- Keep service account key private
- Always use HTTPS in production
- Regularly update dependencies

## Ready to Build?

You now have a fully functional music player! Next steps:

1. **Customize**: Modify colors, fonts, layout
2. **Add features**: Implement new functionality
3. **Share playlists**: Add playlist sharing
4. **Deploy**: Get your app on the internet

## Support

If you encounter issues:

1. Check this guide
2. Review [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
3. Check [README.md](../README.md)
4. Review console errors
5. Check server logs

Happy music listening with SoundWave!
