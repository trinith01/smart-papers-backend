import { LRUCache } from 'lru-cache';
import { getImageBuffer, uploadBase64Image } from '../utils/s3Helper.js';

const jpegCache = new LRUCache({
  max: 250,
  maxSize: 50 * 1024 * 1024, // 50MB
  sizeCalculation: (value, key) => value.length,
});

const pngCache = new LRUCache({
  max: 250,
  maxSize: 50 * 1024 * 1024, // 50MB
  sizeCalculation: (value, key) => value.length,
});

export const getImage = async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');

  // Check both caches
  if (jpegCache.has(id)) {
    res.set('Content-Type', 'image/jpeg');
    return res.send(jpegCache.get(id));
  }
  if (pngCache.has(id)) {
    res.set('Content-Type', 'image/png');
    return res.send(pngCache.get(id));
  }

  try {
    const { buffer, format } = await getImageBuffer(id);
    
    // Cache in appropriate cache
    if (format === 'png') {
      pngCache.set(id, buffer);
      res.set('Content-Type', 'image/png');
    } else {
      jpegCache.set(id, buffer);
      res.set('Content-Type', 'image/jpeg');
    }
    
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

    // Detect format and extract base64 data
    let base64Data;
    let format = 'jpg'; // default
    
    if (image.startsWith('data:image/')) {
      const mimeMatch = image.match(/^data:image\/(png|jpeg|jpg);base64,/);
      if (mimeMatch) {
        format = mimeMatch[1] === 'jpeg' || mimeMatch[1] === 'jpg' ? 'jpg' : 'png';
      }
      base64Data = image.split(',')[1];
    } else {
      base64Data = image;
    }

    // Upload to S3 and get ID
    const { id, format: uploadedFormat } = await uploadBase64Image(base64Data, folder, format);

    res.status(200).json({ 
      message: 'Image uploaded successfully', 
      imageId: id,
      format: uploadedFormat,
      url: `/image?id=${id}`
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};
