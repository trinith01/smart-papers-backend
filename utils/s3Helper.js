import { S3 } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3({ region: process.env.AWS_REGION });

const BUCKET = process.env.AWS_S3_BUCKET;

export async function uploadBase64Image(base64, folder = 'questions') {
  const buffer = Buffer.from(base64, 'base64');
  const id = uuidv4();
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
  return data.Body;
}
