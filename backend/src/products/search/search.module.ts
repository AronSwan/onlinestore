import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnifiedCacheModule } from '../../cache/cache.module';
import { ProductsModule } from '../products.module';
import { SearchManagerService } from './search-manager.service';
import { MeiliSearchService } from './meilisearch.service';
import { ZincSearchService } from './zincsearch.service';
import { SearchSuggestionService } from './search-suggestion.service';
import { PopularSearchService } from './popular-search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ConfigModule, UnifiedCacheModule, forwardRef(() => ProductsModule)],
  providers: [
    MeiliSearchService,
    ZincSearchService,
    SearchManagerService,
    SearchSuggestionService,
    PopularSearchService,
  ],
  controllers: [SearchController],
  exports: [
    SearchManagerService,
    MeiliSearchService,
    ZincSearchService,
    SearchSuggestionService,
    PopularSearchService,
  ],
})
export class SearchModule {}
