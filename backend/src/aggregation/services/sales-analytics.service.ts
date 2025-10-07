import { Injectable } from '@nestjs/common';

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{ productId: number; name: string; revenue: number; quantity: number }>;
}

export interface SalesTrend {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

@Injectable()
export class SalesAnalyticsService {
  /**
   * 获取销售概览
   */
  async getSalesOverview(timeRange: string): Promise<SalesData> {
    // TODO: 从数据库查询真实数据
    // 这里是模拟数据
    const mockData: SalesData = {
      totalRevenue: this.generateMockRevenue(timeRange),
      totalOrders: this.generateMockOrders(timeRange),
      averageOrderValue: 0,
      conversionRate: this.generateMockConversionRate(),
      topProducts: this.generateMockTopProducts(),
    };

    mockData.averageOrderValue = mockData.totalRevenue / mockData.totalOrders;

    return mockData;
  }

  /**
   * 获取今日销售额
   */
  async getTodaySales(): Promise<number> {
    // TODO: 查询今日销售数据
    return Math.floor(Math.random() * 50000) + 10000; // 模拟数据：10000-60000
  }

  /**
   * 获取待处理订单数量
   */
  async getPendingOrderCount(): Promise<number> {
    // TODO: 查询待处理订单
    return Math.floor(Math.random() * 50) + 5; // 模拟数据：5-55
  }

  /**
   * 获取销售趋势
   */
  async getSalesTrend(timeRange: string): Promise<SalesTrend[]> {
    const days = this.getTimeRangeDays(timeRange);
    const trend: SalesTrend[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const revenue = Math.floor(Math.random() * 20000) + 5000;
      const orders = Math.floor(Math.random() * 100) + 20;

      trend.push({
        date: date.toISOString().split('T')[0],
        revenue,
        orders,
        averageOrderValue: revenue / orders,
      });
    }

    return trend;
  }

  /**
   * 获取销售漏斗数据
   */
  async getSalesFunnel(): Promise<{
    visitors: number;
    productViews: number;
    addToCart: number;
    checkout: number;
    purchase: number;
  }> {
    // TODO: 从用户行为数据计算
    const visitors = Math.floor(Math.random() * 10000) + 5000;
    const productViews = Math.floor(visitors * 0.6);
    const addToCart = Math.floor(productViews * 0.3);
    const checkout = Math.floor(addToCart * 0.7);
    const purchase = Math.floor(checkout * 0.8);

    return {
      visitors,
      productViews,
      addToCart,
      checkout,
      purchase,
    };
  }

  /**
   * 获取收入分析
   */
  async getRevenueAnalysis(timeRange: string): Promise<{
    totalRevenue: number;
    revenueByCategory: Record<string, number>;
    revenueByRegion: Record<string, number>;
    revenueGrowth: number;
  }> {
    const totalRevenue = this.generateMockRevenue(timeRange);

    return {
      totalRevenue,
      revenueByCategory: {
        电子产品: totalRevenue * 0.4,
        服装: totalRevenue * 0.3,
        家居: totalRevenue * 0.2,
        其他: totalRevenue * 0.1,
      },
      revenueByRegion: {
        华东: totalRevenue * 0.35,
        华南: totalRevenue * 0.25,
        华北: totalRevenue * 0.2,
        西南: totalRevenue * 0.12,
        其他: totalRevenue * 0.08,
      },
      revenueGrowth: (Math.random() - 0.5) * 40, // -20% 到 +20%
    };
  }

  /**
   * 生成模拟收入数据
   */
  private generateMockRevenue(timeRange: string): number {
    const multiplier = this.getTimeRangeDays(timeRange);
    return Math.floor(Math.random() * 10000 * multiplier) + 5000 * multiplier;
  }

  /**
   * 生成模拟订单数据
   */
  private generateMockOrders(timeRange: string): number {
    const multiplier = this.getTimeRangeDays(timeRange);
    return Math.floor(Math.random() * 100 * multiplier) + 20 * multiplier;
  }

  /**
   * 生成模拟转化率
   */
  private generateMockConversionRate(): number {
    return Math.random() * 5 + 2; // 2-7%
  }

  /**
   * 生成模拟热销产品
   */
  private generateMockTopProducts() {
    const products = [
      { productId: 1, name: 'iPhone 15 Pro', revenue: 0, quantity: 0 },
      { productId: 2, name: 'MacBook Air M2', revenue: 0, quantity: 0 },
      { productId: 3, name: 'AirPods Pro', revenue: 0, quantity: 0 },
      { productId: 4, name: 'iPad Air', revenue: 0, quantity: 0 },
      { productId: 5, name: 'Apple Watch', revenue: 0, quantity: 0 },
    ];

    return products.map(product => ({
      ...product,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      quantity: Math.floor(Math.random() * 100) + 20,
    }));
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
