/**
 * 搜索用户查询，基于PrestaShop CQRS模式
 * 支持多种搜索条件和分页
 */

export interface UserSearchItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  address?: {
    country?: string;
    city?: string;
  };
}

export interface SearchUsersResult {
  users: UserSearchItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SearchUsersQuery {
  public readonly searchTerm?: string;
  public readonly page: number;
  public readonly limit: number;
  public readonly sortBy: string;
  public readonly sortDirection: 'asc' | 'desc';
  public readonly isActive?: boolean;
  public readonly emailVerified?: boolean;
  public readonly country?: string;
  public readonly city?: string;
  public readonly createdAfter?: string;
  public readonly createdBefore?: string;

  constructor(data: {
    searchTerm?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    isActive?: boolean;
    emailVerified?: boolean;
    country?: string;
    city?: string;
    createdAfter?: string;
    createdBefore?: string;
  }) {
    this.searchTerm = data.searchTerm;
    this.page = data.page || 1;
    this.limit = Math.min(data.limit || 10, 100); // 最大限制100条
    this.sortBy = data.sortBy || 'createdAt';
    this.sortDirection = data.sortDirection || 'desc';
    this.isActive = data.isActive;
    this.emailVerified = data.emailVerified;
    this.country = data.country;
    this.city = data.city;
    this.createdAfter = data.createdAfter;
    this.createdBefore = data.createdBefore;
  }

  /**
   * 获取跳过的记录数
   */
  public getSkip(): number {
    return (this.page - 1) * this.limit;
  }

  /**
   * 检查是否有搜索条件
   */
  public hasSearchTerm(): boolean {
    return !!this.searchTerm && this.searchTerm.trim().length > 0;
  }

  /**
   * 检查是否有地理位置过滤
   */
  public hasLocationFilter(): boolean {
    return !!(this.country || this.city);
  }

  /**
   * 检查是否有日期范围过滤
   */
  public hasDateRangeFilter(): boolean {
    return !!(this.createdAfter || this.createdBefore);
  }

  /**
   * 获取查询标识符
   */
  public getQueryId(): string {
    const filters = [
      this.searchTerm,
      this.isActive?.toString(),
      this.emailVerified?.toString(),
      this.country,
      this.city,
    ]
      .filter(Boolean)
      .join('-');

    return `search-users-${this.page}-${this.limit}-${this.sortBy}-${this.sortDirection}-${filters}`;
  }

  /**
   * 验证排序字段
   */
  public isValidSortField(): boolean {
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'email',
      'firstName',
      'lastName',
      'isActive',
      'emailVerified',
    ];
    return validSortFields.includes(this.sortBy);
  }

  /**
   * 获取清理后的搜索词
   */
  public getCleanSearchTerm(): string {
    if (!this.searchTerm) return '';
    return this.searchTerm.trim().toLowerCase();
  }

  /**
   * 获取偏移量（用于分页）
   */
  public getOffset(): number {
    return this.getSkip();
  }

  /**
   * 获取过滤器对象
   */
  public getFilters(): Record<string, any> {
    const filters: Record<string, any> = {};

    if (this.isActive !== undefined) filters.isActive = this.isActive;
    if (this.emailVerified !== undefined) filters.emailVerified = this.emailVerified;
    if (this.country) filters.country = this.country;
    if (this.city) filters.city = this.city;
    if (this.createdAfter) filters.createdAfter = this.createdAfter;
    if (this.createdBefore) filters.createdBefore = this.createdBefore;

    return filters;
  }

  /**
   * 获取排序选项
   */
  public getSortOptions(): { field: string; direction: string } {
    return {
      field: this.sortBy,
      direction: this.sortDirection,
    };
  }
}
