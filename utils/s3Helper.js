import { S3 } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const s3 = new S3({ region: process.env.AWS_REGION });

const BUCKET = process.env.AWS_S3_BUCKET;

export async function uploadBase64Image(base64, folder = 'questions', format = 'jpg') {
  const buffer = Buffer.from(base64, 'base64');
  
  const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
  const extension = format === 'png' ? 'png' : 'jpg';
  
  const id = crypto.randomUUID();
  const key = `${folder}/${id}.${extension}`;
  await s3.putObject({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentEncoding: 'base64',
    ContentType: contentType,
  });
  return { id, format: extension };
}

export function getImageKey(id, folder = 'questions', format = 'jpg') {
  return `${folder}/${id}.${format}`;
}

export async function getImageBuffer(id, folder = 'questions', format = null) {
  // If format is provided, use it directly
  if (format) {
    const key = getImageKey(id, folder, format);
    const data = await s3.getObject({ Bucket: BUCKET, Key: key });
    return { buffer: await convertS3BodyToBuffer(data.Body), format };
  }
  
  // Otherwise, try jpg first (backward compatibility), then png
  let data;
  let detectedFormat = 'jpg';
  try {
    const keyJpg = `${folder}/${id}.jpg`;
    data = await s3.getObject({ Bucket: BUCKET, Key: keyJpg });
  } catch (err) {
    // If jpg doesn't exist, try png
    const keyPng = `${folder}/${id}.png`;
    data = await s3.getObject({ Bucket: BUCKET, Key: keyPng });
    detectedFormat = 'png';
  }
  
  const buffer = await convertS3BodyToBuffer(data.Body);
  return { buffer, format: detectedFormat };
}

async function convertS3BodyToBuffer(body) {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  // If it's a stream, convert to Buffer
  if (typeof body?.pipe === 'function') {
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Unknown S3 Body type');
}
