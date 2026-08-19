import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with your secret environment variables
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // KEEP THIS SECRET!
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { fileUrl, resourceType } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ message: 'File URL is required' });
    }

    // Extract the 'public_id' from the Cloudinary URL
    // Example: https://res.cloudinary.com/.../upload/v1234567/music/song.mp3 -> music/song
    const matches = fileUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    const publicId = matches ? matches[1] : null;

    if (!publicId) {
      return res.status(400).json({ message: 'Could not extract public ID' });
    }

    // Tell Cloudinary to delete the file
    // resourceType is 'video' for audio files, and 'image' for cover art
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    return res.status(200).json({ success: true, message: 'Deleted from Cloudinary' });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}