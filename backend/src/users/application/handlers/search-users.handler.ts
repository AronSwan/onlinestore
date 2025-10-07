/**
 * 搜索用户查询处理器，基于PrestaShop搜索模式
 * 处理用户搜索和过滤逻辑
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { SearchUsersQuery, SearchUsersResult } from '../queries/search-users.query';
import { EnhancedUsersRepository } from '../../infrastructure/repositories/enhanced-users.repository';

@Injectable()
@QueryHandler(SearchUsersQuery)
export class SearchUsersHandler implements IQueryHandler<SearchUsersQuery> {
  constructor(
    @Inject('EnhancedUsersRepository')
    private readonly usersRepository: EnhancedUsersRepository,
  ) {}

  async execute(query: SearchUsersQuery): Promise<SearchUsersResult> {
    return await this.usersRepository.search(query);
  }
}
