export declare class EmbeddingService {
    private readonly logger;
    private extractor;
    private loading;
    private getExtractor;
    embed(texts: string[]): Promise<number[][]>;
    embedOne(text: string): Promise<number[]>;
    get dimensions(): number;
}
