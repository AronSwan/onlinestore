"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EmbeddingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
const transformers_1 = require("@huggingface/transformers");
let EmbeddingService = EmbeddingService_1 = class EmbeddingService {
    constructor() {
        this.logger = new common_1.Logger(EmbeddingService_1.name);
        this.extractor = null;
        this.loading = null;
    }
    async getExtractor() {
        if (this.extractor)
            return this.extractor;
        if (!this.loading) {
            this.loading = (async () => {
                const t0 = Date.now();
                const ext = await (0, transformers_1.pipeline)('feature-extraction', '.local-models/bge-small-zh-v1.5', { dtype: 'q8' });
                this.logger.log(`语义模型加载完成 (${Date.now() - t0}ms, bge-small-zh q8)`);
                this.extractor = ext;
                return ext;
            })().catch((e) => {
                this.loading = null;
                throw e;
            });
        }
        return this.loading;
    }
    async embed(texts) {
        if (!texts.length)
            return [];
        const ext = await this.getExtractor();
        const out = await ext(texts, { pooling: 'mean', normalize: true });
        return Array.from(out.data ? out : out.tolist ? out.tolist() : out).map((row) => Array.from(row.data || row));
    }
    async embedOne(text) {
        return (await this.embed([text]))[0];
    }
    get dimensions() {
        return 512;
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = EmbeddingService_1 = __decorate([
    (0, common_1.Injectable)()
], EmbeddingService);
