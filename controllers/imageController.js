import { LRUCache } from 'lru-cache';
import { getImageBuffer, uploadBase64Image } from '../utils/s3Helper.js';

const cache = new LRUCache({
  max: 500, // max number of images
  maxSize: 100 * 1024 * 1024, // 100MB
  sizeCalculation: (value, key) => value.length, // value is a Buffer
});

export const getImage = async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');

  // Check cache
  if (cache.has(id)) {
    res.set('Content-Type', 'image/jpeg');
    return res.send(cache.get(id));
  }

  try {
    const buffer = await getImageBuffer(id);
    cache.set(id, buffer); // Cache it
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (err) {
    console.error("Error retrieving image:", err);
    res.status(404).send('Image not found');
  }
};

export const uploadImage = async (req, res) => {
  try {
    const { image, folder = 'questions' } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Check if it's base64
    let base64Data;
    if (image.startsWith('data:image/')) {
      // Extract base64 part from data URL
      base64Data = image.split(',')[1];
    } else {
      base64Data = image;
    }

    // Upload to S3 and get ID
    const imageId = await uploadBase64Image(base64Data, folder);

    res.status(200).json({ 
      message: 'Image uploaded successfully', 
      imageId,
      url: `/image?id=${imageId}`
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};
