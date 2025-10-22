import { S3 } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const s3 = new S3({ region: process.env.AWS_REGION });

const BUCKET = process.env.AWS_S3_BUCKET;

export async function uploadBase64Image(base64, folder = 'questions') {
  const buffer = Buffer.from(base64, 'base64');
  const id = crypto.randomUUID();
  const key = `${folder}/${id}.jpg`;
  await s3.putObject({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
  });
  return id;
}

export function getImageKey(id, folder = 'questions') {
  return `${folder}/${id}.jpg`;
}

export async function getImageBuffer(id, folder = 'questions') {
  const key = getImageKey(id, folder);
  const data = await s3.getObject({ Bucket: BUCKET, Key: key });
  if (Buffer.isBuffer(data.Body)) {
    return data.Body;
  }
  if (data.Body instanceof Uint8Array) {
    return Buffer.from(data.Body);
  }
  // If it's a stream, convert to Buffer
  if (typeof data.Body?.pipe === 'function') {
    const chunks = [];
    for await (const chunk of data.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Unknown S3 Body type');
}
