import type { PostRepository } from "@/lib/domain/post/repository";
import type { PostMeta, PostViewModel } from "@/lib/application/post/dto";
import { toPostViewModel } from "@/lib/application/post/mapper";

// DI: server 層から Repository を注入して利用する
export function makePostUsecase(deps: { postRepository: PostRepository }) {
  return {
    async listMeta(): Promise<PostMeta[]> {
      return deps.postRepository.listMeta();
    },

    async getBySlug(slug: string): Promise<PostViewModel | null> {
      const dto = await deps.postRepository.getBySlug(slug);
      if (!dto) return null;
      return toPostViewModel(dto);
    },
  };
}
