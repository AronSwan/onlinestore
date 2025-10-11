import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UnifiedCacheModule } from '../../cache/cache.module';
import { CacheStrategiesModule } from '../../cache-strategies/cache-strategies.module';
import { ProductsModule } from '../products.module';
import { SearchManagerService } from './search-manager.service';
import { MeiliSearchService } from './meilisearch.service';
import { ZincSearchService } from './zincsearch.service';
import { SearchSuggestionService } from './search-suggestion.service';
import { PopularSearchService } from './popular-search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    UnifiedCacheModule,
    CacheStrategiesModule,
    forwardRef(() => ProductsModule),
  ],
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
