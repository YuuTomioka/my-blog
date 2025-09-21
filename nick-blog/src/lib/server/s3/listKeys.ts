import "server-only";

import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "./client";

export async function listKeys(prefix: string, max = 1000): Promise<string[]> {
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, MaxKeys: max })
  );
  return (listed.Contents ?? []).map(o => o.Key!).filter(Boolean);
}
