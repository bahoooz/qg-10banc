import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const BUCKET = "us_media_bucket";

export async function getSignedUrlForVideo(gcsUri: string) {
  const [, bucketName, ...pathParts] = gcsUri.split("/");
  const filePath = pathParts.join("/");

  const file = storage.bucket(bucketName || BUCKET).file(filePath);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  });
  return url;
}
