"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const cache_module_1 = require("../../cache/cache.module");
const products_module_1 = require("../products.module");
const search_manager_service_1 = require("./search-manager.service");
const meilisearch_service_1 = require("./meilisearch.service");
const zincsearch_service_1 = require("./zincsearch.service");
const search_suggestion_service_1 = require("./search-suggestion.service");
const popular_search_service_1 = require("./popular-search.service");
const embedding_service_1 = require("./embedding.service");
const search_controller_1 = require("./search.controller");
let SearchModule = class SearchModule {
};
exports.SearchModule = SearchModule;
exports.SearchModule = SearchModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            axios_1.HttpModule,
            cache_module_1.UnifiedCacheModule,
            (0, common_1.forwardRef)(() => products_module_1.ProductsModule),
        ],
        providers: [
            meilisearch_service_1.MeiliSearchService,
            zincsearch_service_1.ZincSearchService,
            search_manager_service_1.SearchManagerService,
            search_suggestion_service_1.SearchSuggestionService,
            popular_search_service_1.PopularSearchService,
            embedding_service_1.EmbeddingService,
        ],
        controllers: [search_controller_1.SearchController],
        exports: [
            embedding_service_1.EmbeddingService,
            search_manager_service_1.SearchManagerService,
            meilisearch_service_1.MeiliSearchService,
            zincsearch_service_1.ZincSearchService,
            search_suggestion_service_1.SearchSuggestionService,
            popular_search_service_1.PopularSearchService,
        ],
    })
], SearchModule);
