import { LRUCache } from 'lru-cache';
import { getImageBuffer } from '../utils/s3Helper.js';

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
    res.status(404).send('Image not found');
  }
};
