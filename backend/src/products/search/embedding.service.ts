import { Injectable, Logger } from '@nestjs/common';
import { pipeline } from '@huggingface/transformers';

/**
 * 本地中文语义向量服务（2026-10-07 立，"智能且快"搜索批）。
 * 模型=bge-small-zh-v1.5 量化 ONNX（24MB，随仓本地加载，零外部依赖），
 * CPU 推理实测 10-20ms/条（backend/.local-models/，gitignore 遮蔽）。
 * 用途：商品入库时算向量灌 Meili（userProvided），查询时算 query 向量走 hybrid。
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private extractor: any = null;
  private loading: Promise<any> | null = null;

  private async getExtractor() {
    if (this.extractor) return this.extractor;
    if (!this.loading) {
      this.loading = (async () => {
        const t0 = Date.now();
        const ext = await pipeline('feature-extraction', '.local-models/bge-small-zh-v1.5', { dtype: 'q8' });
        this.logger.log(`语义模型加载完成 (${Date.now() - t0}ms, bge-small-zh q8)`);
        this.extractor = ext;
        return ext;
      })().catch((e) => {
        this.loading = null; // 失败允许重试
        throw e;
      });
    }
    return this.loading;
  }

  /** 批量文本转向量（归一化均值池化，512 维）。失败抛错由调用方降级。 */
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const ext = await this.getExtractor();
    const out = await ext(texts, { pooling: 'mean', normalize: true });
    return Array.from(out.data ? out : out.tolist ? out.tolist() : out).map(
      (row: any) => Array.from(row.data || row),
    );
  }

  async embedOne(text: string): Promise<number[]> {
    return (await this.embed([text]))[0];
  }

  get dimensions(): number {
    return 512;
  }
}
