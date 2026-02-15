# SoundWave - Music Player Application

A modern, full-featured music player built with React, Vite, and Firebase. Create playlists, manage your music, and enjoy seamless playback with a beautiful interface.

## Features

- **User Authentication**: Sign up and log in with Firebase Auth
- **Playlist Management**: Create, organize, and manage your music playlists
- **Music Playback**: Play, pause, skip, and control volume
- **Real-time Sync**: Real-time playlist updates with Firestore
- **Audio Visualization**: Interactive player controls
- **Responsive Design**: Beautiful UI that works on all devices
- **Cloud Storage**: Store and access your music files

## Tech Stack

### Frontend
- **React 18**: Modern UI framework
- **Vite**: Lightning-fast build tool
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Router**: Client-side routing
- **Firebase SDK**: Authentication and Firestore

### Backend
- **Node.js**: JavaScript runtime
- **Firebase Admin SDK**: Server-side Firebase operations
- **Native HTTP Module**: Lightweight, no framework dependencies

### Database & Storage
- **Firebase Firestore**: Real-time database
- **Firebase Storage**: Audio file storage
- **Firebase Auth**: User authentication

## Getting Started

### Prerequisites
- Node.js 18+ and npm/pnpm
- A Firebase project (see [Firebase Setup Guide](./docs/FIREBASE_SETUP.md))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd soundwave
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Firebase**
   - Follow the [Firebase Setup Guide](./docs/FIREBASE_SETUP.md)
   - Create `.env` with your Firebase credentials

4. **Install server dependencies**
   ```bash
   cd server && pnpm install && cd ..
   ```

### Running Locally

**Terminal 1 - Frontend Development Server:**
```bash
pnpm dev
```
Opens at `http://localhost:5173`

**Terminal 2 - Backend API Server:**
```bash
cd server && pnpm start
```
Runs on `http://localhost:3001`

### Environment Variables

**Frontend (.env)**
```
VITE_FIREBASE_API_KEY=your_value
VITE_FIREBASE_AUTH_DOMAIN=your_value
VITE_FIREBASE_PROJECT_ID=your_value
VITE_FIREBASE_STORAGE_BUCKET=your_value
VITE_FIREBASE_MESSAGING_SENDER_ID=your_value
VITE_FIREBASE_APP_ID=your_value
VITE_API_URL=http://localhost:3001
```

**Backend (server/.env)**
```
VITE_FIREBASE_PROJECT_ID=your_value
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
PORT=3001
```

## Project Structure

```
soundwave/
├── src/
│   ├── components/        # React components
│   ├── context/          # React Context for state management
│   ├── pages/            # Page components
│   ├── utils/            # Utility functions
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── server/
│   ├── index.js         # Express server
│   ├── firebaseAdmin.js # Firebase initialization
│   ├── handlers.js      # API route handlers
│   ├── package.json     # Server dependencies
│   └── .env.example     # Environment variable template
├── docs/
│   └── FIREBASE_SETUP.md # Firebase configuration guide
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── package.json         # Frontend dependencies
└── README.md            # This file
```

## Key Features Explained

### Authentication
- Users sign up with email/password
- Firebase Auth handles session management
- Protected routes ensure only authenticated users access the dashboard

### Playlists
- Create custom playlists
- View all playlists in the sidebar
- Real-time updates when playlists are modified
- Delete playlists when no longer needed

### Music Player
- Play/pause controls
- Skip to next/previous song
- Progress bar with timeline scrubbing
- Volume control
- Now-playing display

### API Endpoints

**Authentication**
- `POST /api/auth/verify` - Verify Firebase token

**Playlists**
- `GET /api/playlists` - Get user's playlists
- `POST /api/playlists` - Create new playlist
- `GET /api/playlists/:id` - Get specific playlist
- `DELETE /api/playlists/:id` - Delete playlist

**Songs**
- `GET /api/songs/:playlistId` - Get songs in playlist
- `POST /api/songs/:playlistId` - Add song to playlist
- `DELETE /api/songs/:playlistId/:songId` - Remove song

## Development

### Adding New Features

1. **New Components**: Add to `src/components/`
2. **New Pages**: Add to `src/pages/`
3. **API Integration**: Update handlers in `server/handlers.js`
4. **State Management**: Use existing Context API or extend in `src/context/`

### Code Style
- TypeScript for type safety
- Tailwind CSS for styling
- React hooks for state management
- ESM modules for imports

## Building for Production

**Frontend Build**
```bash
pnpm build
```
Creates optimized build in `dist/`

**Deploy Frontend**
- Vercel: `pnpm build && vercel deploy`
- Netlify: Connect repository, auto-deploys
- Other: Deploy `dist/` folder to your hosting

**Deploy Backend**
- Heroku: `git push heroku main`
- Railway: Connect repository
- AWS/GCP: Deploy Node.js container

## Troubleshooting

### Firebase Connection Issues
- Check environment variables are correct
- Verify Firebase project exists
- Check Firestore security rules

### Songs Not Saving
- Verify Firestore database is created
- Check security rules allow writes
- Ensure user is authenticated

### Server Not Starting
- Check PORT 3001 is available
- Verify Node.js 18+ is installed
- Check Firebase service account credentials

## Security Considerations

- **Never commit `.env` files** - Use `.env.example` as template
- **Service account key** - Keep `serviceAccountKey.json` private
- **Firestore rules** - Ensure users can only access their own data
- **HTTPS only** - Use HTTPS in production
- **CORS** - Configure CORS properly for your domain

## Performance Tips

- Audio files stored in Firebase Storage
- Firestore real-time listeners for live updates
- Lazy loading for playlists and songs
- Service workers for offline support (future)

## Future Enhancements

- [ ] Share playlists with friends
- [ ] Advanced search and filtering
- [ ] Music recommendations
- [ ] Offline playback
- [ ] Mobile app (React Native)
- [ ] Social features (comments, likes)
- [ ] Advanced audio visualization
- [ ] Lyrics support

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the [Firebase Setup Guide](./docs/FIREBASE_SETUP.md)
2. Review the code comments
3. Check Firebase documentation
4. Open an issue on GitHub

## Author

Created with ❤️ for music lovers everywhere.
