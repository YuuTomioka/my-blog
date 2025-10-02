import type { PostRepository } from "@/lib/domain/post/repository";
import { S3PostRepository } from "@/lib/server/gateway/post/repositoryImpl.s3";
import { LocalFsPostRepository } from "@/lib/server/gateway/post/repositoryImpl.local";

const STORAGE_DRIVER = process.env.STORAGE_DRIVER ?? "local"; // "local" | "s3"

// --- Factory ---
export function makePostRepository(): PostRepository {
  if (STORAGE_DRIVER === "s3") return new S3PostRepository();
  return new LocalFsPostRepository();
}