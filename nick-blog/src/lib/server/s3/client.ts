import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

export const BUCKET = process.env.S3_BUCKET!;
export const s3 = new S3Client({ region: process.env.AWS_REGION });