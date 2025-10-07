import { Injectable } from '@nestjs/common';

export interface ProductData {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  topSellingProducts: Array<{ id: number; name: string; sales: number; revenue: number }>;
  categoryPerformance: Record<string, { sales: number; revenue: number }>;
}

export interface ProductPerformanceTrend {
  date: string;
  views: number;
  sales: number;
  revenue: number;
  conversionRate: number;
}

@Injectable()
export class ProductAnalyticsService {
  /**
   * 获取产品概览
   */
  async getProductOverview(timeRange: string): Promise<ProductData> {
    // TODO: 从数据库查询真实产品数据
    const totalProducts = Math.floor(Math.random() * 1000) + 500;
    const activeProducts = Math.floor(totalProducts * 0.8);
    const lowStockProducts = Math.floor(totalProducts * 0.1);

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      topSellingProducts: this.generateTopSellingProducts(),
      categoryPerformance: this.generateCategoryPerformance(),
    };
  }

  /**
   * 获取库存不足的产品
   */
  async getLowStockProducts(): Promise<
    Array<{
      id: number;
      name: string;
      currentStock: number;
      minStock: number;
      category: string;
    }>
  > {
    // TODO: 从数据库查询真实库存数据
    return [
      { id: 1, name: 'iPhone 15 Pro', currentStock: 5, minStock: 10, category: '电子产品' },
      { id: 2, name: 'MacBook Air M2', currentStock: 3, minStock: 8, category: '电子产品' },
      { id: 3, name: 'Nike Air Max', currentStock: 2, minStock: 15, category: '运动鞋' },
      { id: 4, name: 'Adidas T-shirt', currentStock: 8, minStock: 20, category: '服装' },
      { id: 5, name: '咖啡机', currentStock: 1, minStock: 5, category: '家电' },
    ];
  }

  /**
   * 获取产品性能趋势
   */
  async getProductPerformanceTrend(timeRange: string): Promise<ProductPerformanceTrend[]> {
    const days = this.getTimeRangeDays(timeRange);
    const trend: ProductPerformanceTrend[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const views = Math.floor(Math.random() * 5000) + 1000;
      const sales = Math.floor(Math.random() * 200) + 50;
      const revenue = sales * (Math.random() * 500 + 100);
      const conversionRate = (sales / views) * 100;

      trend.push({
        date: date.toISOString().split('T')[0],
        views,
        sales,
        revenue,
        conversionRate,
      });
    }

    return trend;
  }

  /**
   * 获取产品搜索分析
   */
  async getProductSearchAnalysis(): Promise<{
    totalSearches: number;
    topSearchTerms: Array<{ term: string; count: number; conversionRate: number }>;
    noResultsSearches: Array<{ term: string; count: number }>;
  }> {
    return {
      totalSearches: Math.floor(Math.random() * 10000) + 5000,
      topSearchTerms: [
        { term: 'iPhone', count: 1250, conversionRate: 15.2 },
        { term: 'MacBook', count: 980, conversionRate: 12.8 },
        { term: 'AirPods', count: 850, conversionRate: 18.5 },
        { term: 'iPad', count: 720, conversionRate: 14.1 },
        { term: 'Apple Watch', count: 650, conversionRate: 16.3 },
        { term: 'Nike', count: 580, conversionRate: 8.7 },
        { term: 'Adidas', count: 520, conversionRate: 9.2 },
        { term: '咖啡机', count: 450, conversionRate: 22.1 },
        { term: '运动鞋', count: 420, conversionRate: 11.5 },
        { term: '笔记本', count: 380, conversionRate: 13.8 },
      ],
      noResultsSearches: [
        { term: 'Samsung Galaxy S25', count: 45 },
        { term: 'PlayStation 6', count: 32 },
        { term: 'Tesla Model Y', count: 28 },
        { term: 'Nintendo Switch Pro', count: 25 },
        { term: 'Google Pixel 9', count: 22 },
      ],
    };
  }

  /**
   * 获取产品评价分析
   */
  async getProductReviewAnalysis(): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<string, number>;
    topRatedProducts: Array<{ id: number; name: string; rating: number; reviewCount: number }>;
    lowRatedProducts: Array<{ id: number; name: string; rating: number; reviewCount: number }>;
  }> {
    const totalReviews = Math.floor(Math.random() * 5000) + 2000;

    return {
      averageRating: Math.random() * 1.5 + 3.5, // 3.5-5.0
      totalReviews,
      ratingDistribution: {
        '5': Math.floor(totalReviews * 0.45),
        '4': Math.floor(totalReviews * 0.3),
        '3': Math.floor(totalReviews * 0.15),
        '2': Math.floor(totalReviews * 0.07),
        '1': Math.floor(totalReviews * 0.03),
      },
      topRatedProducts: [
        { id: 1, name: 'iPhone 15 Pro', rating: 4.8, reviewCount: 245 },
        { id: 2, name: 'AirPods Pro', rating: 4.7, reviewCount: 189 },
        { id: 3, name: 'MacBook Air M2', rating: 4.6, reviewCount: 156 },
        { id: 4, name: 'iPad Air', rating: 4.5, reviewCount: 134 },
        { id: 5, name: 'Apple Watch', rating: 4.4, reviewCount: 98 },
      ],
      lowRatedProducts: [
        { id: 101, name: '廉价耳机', rating: 2.1, reviewCount: 67 },
        { id: 102, name: '山寨充电器', rating: 2.3, reviewCount: 45 },
        { id: 103, name: '劣质手机壳', rating: 2.5, reviewCount: 89 },
        { id: 104, name: '便宜数据线', rating: 2.7, reviewCount: 123 },
        { id: 105, name: '低端蓝牙音箱', rating: 2.8, reviewCount: 78 },
      ],
    };
  }

  /**
   * 获取产品库存分析
   */
  async getInventoryAnalysis(): Promise<{
    totalValue: number;
    turnoverRate: number;
    slowMovingProducts: Array<{ id: number; name: string; daysInStock: number; quantity: number }>;
    fastMovingProducts: Array<{ id: number; name: string; turnoverRate: number; quantity: number }>;
  }> {
    return {
      totalValue: Math.floor(Math.random() * 1000000) + 500000,
      turnoverRate: Math.random() * 5 + 3, // 3-8次/年
      slowMovingProducts: [
        { id: 201, name: '过季服装', daysInStock: 180, quantity: 45 },
        { id: 202, name: '老款手机', daysInStock: 150, quantity: 23 },
        { id: 203, name: '停产配件', daysInStock: 120, quantity: 67 },
        { id: 204, name: '季节性商品', daysInStock: 90, quantity: 34 },
        { id: 205, name: '小众品牌', daysInStock: 75, quantity: 12 },
      ],
      fastMovingProducts: [
        { id: 301, name: 'iPhone 15 Pro', turnoverRate: 24, quantity: 156 },
        { id: 302, name: 'AirPods Pro', turnoverRate: 18, quantity: 234 },
        { id: 303, name: '热门T恤', turnoverRate: 15, quantity: 345 },
        { id: 304, name: '运动鞋', turnoverRate: 12, quantity: 189 },
        { id: 305, name: '咖啡豆', turnoverRate: 36, quantity: 567 },
      ],
    };
  }

  /**
   * 生成热销产品数据
   */
  private generateTopSellingProducts() {
    const products = [
      { id: 1, name: 'iPhone 15 Pro', sales: 0, revenue: 0 },
      { id: 2, name: 'MacBook Air M2', sales: 0, revenue: 0 },
      { id: 3, name: 'AirPods Pro', sales: 0, revenue: 0 },
      { id: 4, name: 'iPad Air', sales: 0, revenue: 0 },
      { id: 5, name: 'Apple Watch', sales: 0, revenue: 0 },
      { id: 6, name: 'Nike Air Max', sales: 0, revenue: 0 },
      { id: 7, name: 'Adidas Ultraboost', sales: 0, revenue: 0 },
      { id: 8, name: '咖啡机', sales: 0, revenue: 0 },
    ];

    return products
      .map(product => ({
        ...product,
        sales: Math.floor(Math.random() * 200) + 50,
        revenue: Math.floor(Math.random() * 100000) + 20000,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }

  /**
   * 生成分类性能数据
   */
  private generateCategoryPerformance(): Record<string, { sales: number; revenue: number }> {
    return {
      电子产品: {
        sales: Math.floor(Math.random() * 500) + 200,
        revenue: Math.floor(Math.random() * 500000) + 200000,
      },
      服装: {
        sales: Math.floor(Math.random() * 800) + 300,
        revenue: Math.floor(Math.random() * 200000) + 100000,
      },
      运动用品: {
        sales: Math.floor(Math.random() * 400) + 150,
        revenue: Math.floor(Math.random() * 150000) + 80000,
      },
      家居用品: {
        sales: Math.floor(Math.random() * 300) + 100,
        revenue: Math.floor(Math.random() * 100000) + 50000,
      },
      美妆护肤: {
        sales: Math.floor(Math.random() * 600) + 250,
        revenue: Math.floor(Math.random() * 120000) + 60000,
      },
    };
  }

  /**
   * 根据时间范围获取天数
   */
  private getTimeRangeDays(timeRange: string): number {
    switch (timeRange) {
      case '1d':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 7;
    }
  }
}
