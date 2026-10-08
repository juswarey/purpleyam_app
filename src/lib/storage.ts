import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export interface PickedImage {
  uri: string;
  base64: string;
  ext: string;
  mime: string;
}

/** Opens the photo library and returns images with base64 data ready to upload. */
export async function pickImages(limit = 3): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return [];
  return result.assets
    .filter((a) => !!a.base64)
    .map((a) => {
      const mime = a.mimeType ?? 'image/jpeg';
      const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : (mime.split('/')[1] ?? 'jpg');
      return { uri: a.uri, base64: a.base64 as string, ext, mime };
    });
}

/** Uploads to a private bucket. Path starts with the user's id (required by the storage policies). */
export async function uploadToBucket(
  bucket: 'order-images' | 'payment-proofs',
  userId: string,
  orderId: string,
  img: PickedImage
): Promise<string> {
  const path = `${userId}/${orderId}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${img.ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(img.base64), { contentType: img.mime });
  if (error) throw error;
  return path;
}

/** Private buckets need a temporary signed URL to display an image. */
export async function getSignedUrl(bucket: 'order-images' | 'payment-proofs', path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
