# SoundWave Deployment Guide

This guide covers deploying SoundWave to production on various platforms.

## Prerequisites

- Firebase project set up with Firestore, Storage, and Authentication
- Service account key from Firebase
- Git repository with the code
- Node.js 18+ installed locally

## Frontend Deployment

### Option 1: Vercel (Recommended)

Vercel is the optimal choice as it's optimized for Next.js/React applications and offers great performance.

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Build the project**
   ```bash
   pnpm build
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set environment variables in Vercel Dashboard**
   - Go to your project settings
   - Add these variables:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_API_URL` (your backend URL)

5. **Redeploy** to apply environment variables

### Option 2: Netlify

1. **Connect repository**
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Select your repository

2. **Configure build settings**
   - Build command: `pnpm build`
   - Publish directory: `dist`

3. **Set environment variables**
   - Go to Site Settings → Build & Deploy → Environment
   - Add all VITE_* variables

4. **Deploy**
   - Netlify auto-deploys on git push

### Option 3: Manual Deployment (AWS S3 + CloudFront)

1. **Build**
   ```bash
   pnpm build
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync dist/ s3://your-bucket-name
   ```

3. **Create CloudFront distribution** for the S3 bucket

4. **Set custom domain** in Route 53

## Backend Deployment

### Option 1: Railway (Recommended)

Railway provides an easy Node.js hosting experience.

#### Steps:

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Connect your GitHub repository**
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository

3. **Configure service**
   - Set root directory to `server/`
   - Set build command: `npm install`
   - Set start command: `node index.js`

4. **Add environment variables**
   - `VITE_FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (raw JSON)
   - `PORT=3001`
   - `NODE_ENV=production`

5. **Deploy**
   - Railway auto-deploys on git push

6. **Get your backend URL**
   - Copy the public URL from Railway dashboard
   - Update `VITE_API_URL` in frontend to this URL

### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   npm i -g heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create app**
   ```bash
   heroku create your-soundwave-api
   ```

4. **Add buildpack for Node.js**
   ```bash
   heroku buildpacks:add heroku/nodejs
   ```

5. **Set environment variables**
   ```bash
   heroku config:set VITE_FIREBASE_PROJECT_ID=your_id
   heroku config:set FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"..."}'
   heroku config:set NODE_ENV=production
   ```

6. **Create Procfile in server directory**
   ```
   web: node index.js
   ```

7. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 3: AWS EC2

1. **Launch EC2 instance**
   - Ubuntu 20.04 LTS
   - Allow HTTP (80) and HTTPS (443) ports

2. **SSH into instance**
   ```bash
   ssh -i key.pem ubuntu@your-instance-ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Clone repository**
   ```bash
   git clone your-repo-url
   cd soundwave/server
   ```

5. **Install dependencies**
   ```bash
   npm install
   ```

6. **Create .env file**
   ```bash
   cat > .env << EOF
   VITE_FIREBASE_PROJECT_ID=your_id
   FIREBASE_SERVICE_ACCOUNT_KEY='{...}'
   PORT=3001
   NODE_ENV=production
   EOF
   ```

7. **Use PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start index.js --name "soundwave-api"
   pm2 startup
   pm2 save
   ```

8. **Set up Nginx reverse proxy**
   ```bash
   sudo apt install nginx
   ```

9. **Configure Nginx** to proxy requests to localhost:3001

10. **Set up SSL with Let's Encrypt**
    ```bash
    sudo snap install certbot --classic
    sudo certbot certonly --standalone -d your-domain.com
    ```

## Database Setup for Production

### Firestore Security Rules

Replace default rules with production-ready rules:

```firebase
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their playlists
    match /playlists/{playlistId} {
      allow read, update, delete: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
      
      // Allow reading songs in playlists
      match /songs/{songId} {
        allow read, create, delete: if request.auth.uid == get(/databases/$(database)/documents/playlists/$(playlistId)).data.userId;
      }
    }
  }
}
```

### Storage Security Rules

```firebase
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /playlists/{playlistId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 100 * 1024 * 1024;
    }
  }
}
```

## Domain Configuration

### Frontend Domain
- Vercel: Automatic DNS setup
- Netlify: Add custom domain in settings
- S3 + CloudFront: Set in Route 53

### Backend Domain
- Use subdomain like `api.yourdomain.com`
- Update `VITE_API_URL` in frontend

Example for Nginx:
```nginx
server {
  server_name api.yourdomain.com;
  
  location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

## SSL/HTTPS Configuration

All production deployments should use HTTPS. Most platforms handle this automatically:

- **Vercel**: Automatic SSL
- **Netlify**: Automatic SSL
- **Railway**: Automatic SSL
- **Heroku**: Automatic SSL
- **AWS**: Use ACM + CloudFront or Let's Encrypt

## Monitoring & Logging

### Frontend
- Enable Vercel Analytics
- Set up error tracking with Sentry
- Monitor performance with Web Vitals

### Backend
- Use PM2 monitoring
- Set up error logging with Sentry
- Monitor Firebase usage in console

### Logging Service Example (Sentry)

```typescript
// In server/index.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Performance Optimization

### Frontend
- Enable Vite minification (default)
- Use code splitting with React lazy
- Enable gzip compression
- Cache static assets

### Backend
- Enable HTTP/2
- Use connection pooling
- Add rate limiting
- Cache frequent queries

## Backup & Recovery

1. **Firestore automatic backups**
   - Enabled by default
   - Available from Firebase console

2. **Manual exports**
   ```bash
   gcloud firestore export gs://your-bucket/backup-$(date +%s)
   ```

3. **Database restoration**
   ```bash
   gcloud firestore import gs://your-bucket/backup-timestamp
   ```

## Troubleshooting

### Frontend not loading
- Check environment variables
- Verify backend API URL
- Check browser console for errors

### Songs not uploading
- Check Firebase Storage rules
- Verify file size limits
- Check CORS configuration

### Backend connection issues
- Verify service account credentials
- Check Firebase project permissions
- Review server logs

## Post-Deployment

1. **Test all features**
   - User signup/login
   - Playlist creation
   - Song upload/playback
   - Real-time sync

2. **Monitor performance**
   - Check page load times
   - Monitor API response times
   - Track error rates

3. **Set up alerts**
   - Uptime monitoring
   - Error rate monitoring
   - Performance monitoring

4. **Plan maintenance**
   - Regular security updates
   - Database cleanup
   - Log rotation
