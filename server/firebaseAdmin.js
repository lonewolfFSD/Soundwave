import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Firebase Admin SDK
// The service account key should be stored in environment variables
// For development, you can use a JSON file path stored in an env variable

let serviceAccount

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Load from file path (useful for local development)
    const fs = await import('fs')
    const path = await import('path')
    const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Parse from JSON string in environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  } else {
    console.warn('Firebase service account key not configured. Some features may not work.')
    // For development without full Firebase setup
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
    })
  }
} catch (error) {
  console.warn('Error loading Firebase credentials:', error.message)
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  })
} else if (!admin.apps.length) {
  // Fallback initialization
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  })
}

export default admin
