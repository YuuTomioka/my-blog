import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "./client";

export async function getObjectText(key: string): Promise<string | null> {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const raw = await obj.Body?.transformToString();
  return raw ?? null;
}
