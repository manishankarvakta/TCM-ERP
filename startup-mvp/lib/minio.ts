import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * MinIO Configuration Interface
 */
export interface MinIOConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  publicUrl: string;
}

/**
 * Get MinIO configuration from environment variables
 * @throws {Error} If required environment variables are missing
 */
function getMinIOConfig(): MinIOConfig {
  const endpoint = process.env.MINIO_ENDPOINT;
  const port = process.env.MINIO_PORT;
  const useSSL = process.env.MINIO_USE_SSL;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucketName = process.env.MINIO_BUCKET_NAME;
  const publicUrl = process.env.MINIO_PUBLIC_URL;

  if (!endpoint) {
    throw new Error("MINIO_ENDPOINT environment variable is required");
  }
  if (!port) {
    throw new Error("MINIO_PORT environment variable is required");
  }
  if (!accessKey) {
    throw new Error("MINIO_ACCESS_KEY environment variable is required");
  }
  if (!secretKey) {
    throw new Error("MINIO_SECRET_KEY environment variable is required");
  }
  if (!bucketName) {
    throw new Error("MINIO_BUCKET_NAME environment variable is required");
  }
  if (!publicUrl) {
    throw new Error("MINIO_PUBLIC_URL environment variable is required");
  }

  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber)) {
    throw new Error(`MINIO_PORT must be a valid number, got: ${port}`);
  }

  const sslEnabled = useSSL === "true" || useSSL === "1";

  return {
    endpoint,
    port: portNumber,
    useSSL: sslEnabled,
    accessKey,
    secretKey,
    bucketName,
    publicUrl,
  };
}

/**
 * Build MinIO endpoint URL
 */
function buildEndpointUrl(config: MinIOConfig): string {
  const protocol = config.useSSL ? "https" : "http";
  return `${protocol}://${config.endpoint}:${config.port}`;
}

// Get configuration
const config = getMinIOConfig();
const endpointUrl = buildEndpointUrl(config);

/**
 * Configured S3 Client for MinIO
 * Uses forcePathStyle: true for MinIO compatibility
 */
export const s3 = new S3Client({
  endpoint: endpointUrl,
  region: "us-east-1", // MinIO doesn't use regions, but AWS SDK requires it
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
  },
  forcePathStyle: true, // Required for MinIO
});

/**
 * Get a presigned URL for uploading (PUT) an object
 * @param key - Object key (path) in the bucket
 * @param contentType - Optional content type (MIME type)
 * @param expiresIn - Optional expiration time in seconds (default: 3600)
 * @returns Presigned URL for PUT operation
 */
export async function getPresignedPutUrl(
  key: string,
  contentType?: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

/**
 * Get a presigned URL for downloading (GET) an object
 * @param key - Object key (path) in the bucket
 * @param expiresIn - Optional expiration time in seconds (default: 3600)
 * @returns Presigned URL for GET operation
 */
export async function getPresignedGetUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

/**
 * Upload a buffer directly to MinIO
 * @param key - Object key (path) in the bucket
 * @param buffer - Buffer containing the file data
 * @param contentType - Optional content type (MIME type)
 * @returns Promise that resolves when upload is complete
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType?: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(command);
}

/**
 * Delete an object from MinIO
 * @param key - Object key (path) in the bucket
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await s3.send(command);
}

/**
 * Copy an object within MinIO
 * @param sourceKey - Source object key
 * @param destKey - Destination object key
 * @returns Promise that resolves when copy is complete
 */
export async function copyObject(
  sourceKey: string,
  destKey: string
): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: config.bucketName,
    CopySource: `${config.bucketName}/${sourceKey}`,
    Key: destKey,
  });

  await s3.send(command);
}

/**
 * Move an object within MinIO (copy + delete)
 * @param sourceKey - Source object key
 * @param destKey - Destination object key
 * @returns Promise that resolves when move is complete
 */
export async function moveObject(
  sourceKey: string,
  destKey: string
): Promise<void> {
  await copyObject(sourceKey, destKey);
  await deleteObject(sourceKey);
}

/**
 * List objects in MinIO bucket
 * @param prefix - Optional prefix to filter objects
 * @returns Promise that resolves to an array of object keys
 */
export async function listObjects(prefix?: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: prefix,
  });

  const response = await s3.send(command);
  return (response.Contents || []).map((object) => object.Key || "").filter(Boolean);
}

/**
 * Check if an object exists in MinIO
 * @param key - Object key (path) in the bucket
 * @returns Promise that resolves to true if object exists, false otherwise
 */
export async function objectExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    await s3.send(command);
    return true;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      ("name" in error || "$metadata" in error)
    ) {
      const errorObj = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (errorObj.name === "NotFound" || errorObj.$metadata?.httpStatusCode === 404) {
        return false;
      }
    }
    throw error;
  }
}

/**
 * Get the public URL for an object
 * @param key - Object key (path) in the bucket
 * @returns Public URL string
 */
export function getPublicUrl(key: string): string {
  const baseUrl = config.publicUrl.replace(/\/$/, ""); // Remove trailing slash
  const objectKey = key.startsWith("/") ? key : `/${key}`;
  return `${baseUrl}/${config.bucketName}${objectKey}`;
}

/**
 * Normalize folder path - ensure it ends with a slash
 */
function normalizeFolderPath(path: string): string {
  const normalized = path.replace(/^\/+/, ""); // Remove leading slashes
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

/**
 * Create a folder in MinIO
 * In S3/MinIO, folders are represented as empty objects with a trailing slash
 * @param path - Folder path (e.g., "uploads/2024/" or "documents/")
 * @returns Promise that resolves when folder is created
 */
export async function createFolder(path: string): Promise<void> {
  const normalizedPath = normalizeFolderPath(path);
  
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: normalizedPath,
    Body: Buffer.from(""), // Empty body for folder marker
  });

  await s3.send(command);
}

/**
 * Rename a folder in MinIO
 * This operation moves all objects with the old prefix to the new prefix
 * @param oldPath - Old folder path
 * @param newPath - New folder path
 * @returns Promise that resolves when folder rename is complete
 */
export async function renameFolder(
  oldPath: string,
  newPath: string
): Promise<void> {
  const normalizedOldPath = normalizeFolderPath(oldPath);
  const normalizedNewPath = normalizeFolderPath(newPath);

  // List all objects in the old folder
  const objects = await listObjects(normalizedOldPath);

  if (objects.length === 0) {
    // If no objects, just create the new folder marker
    await createFolder(normalizedNewPath);
    // Delete old folder marker if it exists
    try {
      await deleteObject(normalizedOldPath);
    } catch {
      // Ignore if old folder marker doesn't exist
    }
    return;
  }

  // Move all objects from old path to new path
  for (const objectKey of objects) {
    // Remove the old prefix and add the new prefix
    const relativePath = objectKey.replace(normalizedOldPath, "");
    const newKey = `${normalizedNewPath}${relativePath}`;

    // Copy to new location
    await copyObject(objectKey, newKey);
    // Delete from old location
    await deleteObject(objectKey);
  }

  // Move the folder marker itself if it exists
  try {
    await copyObject(normalizedOldPath, normalizedNewPath);
    await deleteObject(normalizedOldPath);
  } catch {
    // Ignore if folder marker doesn't exist
  }
}

/**
 * MinIO utility object with all helper functions
 */
export const minio = {
  // Client
  s3,

  // Presigned URLs
  getPresignedPutUrl,
  getPresignedGetUrl,

  // Upload/Download
  uploadBuffer,
  getPublicUrl,

  // Object Operations
  deleteObject,
  copyObject,
  moveObject,
  listObjects,
  objectExists,

  // Folder Operations
  createFolder,
  renameFolder,

  // Configuration
  get config(): MinIOConfig {
    return { ...config };
  },
};

