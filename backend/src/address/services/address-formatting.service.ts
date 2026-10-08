import { Injectable, Logger } from '@nestjs/common';

export interface AddressComponents {
  house_number?: string;
  road?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface FormattingOptions {
  countryCode?: string;
  language?: string;
  abbreviate?: boolean;
  includeCountry?: boolean;
}

@Injectable()
export class AddressFormattingService {
  private readonly logger = new Logger(AddressFormattingService.name);

  // 国家特定的地址格式模板
  private readonly formatTemplates = {
    US: '{house_number} {road}, {city}, {state} {postcode}',
    CA: '{house_number} {road}, {city}, {state} {postcode}',
    UK: '{house_number} {road}, {city}, {postcode}',
    DE: '{road} {house_number}, {postcode} {city}',
    FR: '{house_number} {road}, {postcode} {city}',
    CN: '{country} {state} {city} {road} {house_number}',
    JP: '{postcode} {state} {city} {road} {house_number}',
    AU: '{house_number} {road}, {city} {state} {postcode}',
    default: '{house_number} {road}, {city}, {state} {postcode}',
  };

  // 常见的街道类型缩写
  private readonly streetAbbreviations = {
    Street: 'St',
    Avenue: 'Ave',
    Road: 'Rd',
    Boulevard: 'Blvd',
    Lane: 'Ln',
    Drive: 'Dr',
    Court: 'Ct',
    Place: 'Pl',
    Way: 'Way',
    Circle: 'Cir',
    Square: 'Sq',
    Trail: 'Tr',
  };

  // 州/省份缩写（美国）
  private readonly stateAbbreviations = {
    Alabama: 'AL',
    Alaska: 'AK',
    Arizona: 'AZ',
    Arkansas: 'AR',
    California: 'CA',
    Colorado: 'CO',
    Connecticut: 'CT',
    Delaware: 'DE',
    Florida: 'FL',
    Georgia: 'GA',
    Hawaii: 'HI',
    Idaho: 'ID',
    Illinois: 'IL',
    Indiana: 'IN',
    Iowa: 'IA',
    Kansas: 'KS',
    Kentucky: 'KY',
    Louisiana: 'LA',
    Maine: 'ME',
    Maryland: 'MD',
    Massachusetts: 'MA',
    Michigan: 'MI',
    Minnesota: 'MN',
    Mississippi: 'MS',
    Missouri: 'MO',
    Montana: 'MT',
    Nebraska: 'NE',
    Nevada: 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    Ohio: 'OH',
    Oklahoma: 'OK',
    Oregon: 'OR',
    Pennsylvania: 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    Tennessee: 'TN',
    Texas: 'TX',
    Utah: 'UT',
    Vermont: 'VT',
    Virginia: 'VA',
    Washington: 'WA',
    'West Virginia': 'WV',
    Wisconsin: 'WI',
    Wyoming: 'WY',
  };

  /**
   * 格式化地址
   */
  async formatAddress(
    components: AddressComponents,
    countryCode?: string,
    options: FormattingOptions = {},
  ): Promise<string> {
    try {
      this.logger.debug(`Formatting address for country: ${countryCode}`);

      // 确定国家代码
      const country = countryCode || components.country_code || options.countryCode || 'default';
      const normalizedCountry = country.toUpperCase();

      // 获取格式模板
      const template =
        (this.formatTemplates as any)[normalizedCountry] || this.formatTemplates.default;

      // 预处理组件
      const processedComponents = this.preprocessComponents(components, options);

      // 应用模板
      let formattedAddress = this.applyTemplate(template, processedComponents);

      // 后处理
      formattedAddress = this.postprocessAddress(formattedAddress, options);

      this.logger.debug(`Address formatting completed`);
      return formattedAddress;
    } catch (error) {
      this.logger.error(`Address formatting failed`, error.stack);
      throw error;
    }
  }

  /**
   * 预处理地址组件
   */
  private preprocessComponents(
    components: AddressComponents,
    options: FormattingOptions,
  ): AddressComponents {
    const processed = { ...components };

    // 应用缩写
    if (options.abbreviate) {
      if (processed.road) {
        processed.road = this.abbreviateStreetType(processed.road);
      }

      if (processed.state) {
        processed.state = this.abbreviateState(processed.state);
      }
    }

    // 标准化大小写
    Object.keys(processed).forEach(key => {
      if ((processed as any)[key] && typeof (processed as any)[key] === 'string') {
        (processed as any)[key] = this.titleCase((processed as any)[key]);
      }
    });

    return processed;
  }

  /**
   * 应用格式模板
   */
  private applyTemplate(template: string, components: AddressComponents): string {
    let result = template;

    // 替换占位符
    Object.keys(components).forEach(key => {
      const placeholder = `{${key}}`;
      const value = (components as any)[key] || '';
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });

    // 清理空的占位符
    result = result.replace(/\{[^}]+\}/g, '');

    return result;
  }

  /**
   * 后处理地址
   */
  private postprocessAddress(address: string, options: FormattingOptions): string {
    let result = address;

    // 移除多余的空格和标点
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/,\s*,/g, ',');
    result = result.replace(/,\s*$/g, '');
    result = result.replace(/^\s*,/g, '');
    result = result.trim();

    // 添加国家（如果需要）
    if (options.includeCountry && options.countryCode) {
      const countryName = this.getCountryName(options.countryCode);
      if (countryName && !result.includes(countryName)) {
        result += `, ${countryName}`;
      }
    }

    return result;
  }

  /**
   * 缩写街道类型
   */
  private abbreviateStreetType(street: string): string {
    let result = street;

    Object.entries(this.streetAbbreviations).forEach(([full, abbr]) => {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      result = result.replace(regex, abbr);
    });

    return result;
  }

  /**
   * 缩写州名
   */
  private abbreviateState(state: string): string {
    return (this.stateAbbreviations as any)[state] || state;
  }

  /**
   * 标题大小写转换
   */
  private titleCase(str: string): string {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  /**
   * 获取国家名称
   */
  private getCountryName(countryCode: string): string {
    const countryNames = {
      US: 'United States',
      CA: 'Canada',
      UK: 'United Kingdom',
      DE: 'Germany',
      FR: 'France',
      CN: 'China',
      JP: 'Japan',
      AU: 'Australia',
    };

    return (countryNames as any)[countryCode.toUpperCase()] || countryCode;
  }

  /**
   * 解析自由格式地址
   */
  async parseAddress(address: string): Promise<AddressComponents> {
    try {
      this.logger.debug(`Parsing address: ${address}`);

      const components: AddressComponents = {};
      const parts = address.split(',').map(part => part.trim());

      // 简单的启发式解析
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (this.looksLikePostalCode(part)) {
          components.postcode = part;
        } else if (this.looksLikeStreetAddress(part)) {
          const streetParts = part.split(' ');
          if (streetParts.length > 0 && /^\d+/.test(streetParts[0])) {
            components.house_number = streetParts[0];
            components.road = streetParts.slice(1).join(' ');
          } else {
            components.road = part;
          }
        } else if (this.looksLikeState(part)) {
          components.state = part;
        } else if (i === parts.length - 1 && this.looksLikeCountry(part)) {
          components.country = part;
        } else {
          // 假设是城市
          components.city = part;
        }
      }

      this.logger.debug(`Address parsing completed`);
      return components;
    } catch (error) {
      this.logger.error(`Address parsing failed for: ${address}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查是否看起来像邮政编码
   */
  private looksLikePostalCode(text: string): boolean {
    return /^\d{3,6}(-\d{4})?$|^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(text.trim());
  }

  /**
   * 检查是否看起来像街道地址
   */
  private looksLikeStreetAddress(text: string): boolean {
    const hasNumber = /^\d+/.test(text.trim());
    const hasStreetType = Object.keys(this.streetAbbreviations).some(type =>
      text.toLowerCase().includes(type.toLowerCase()),
    );
    return hasNumber || hasStreetType;
  }

  /**
   * 检查是否看起来像州/省
   */
  private looksLikeState(text: string): boolean {
    const trimmed = text.trim();
    return (
      Object.keys(this.stateAbbreviations).includes(trimmed) ||
      Object.values(this.stateAbbreviations).includes(trimmed.toUpperCase())
    );
  }

  /**
   * 检查是否看起来像国家
   */
  private looksLikeCountry(text: string): boolean {
    const trimmed = text.trim();
    const commonCountries = [
      'usa',
      'united states',
      'canada',
      'uk',
      'united kingdom',
      'germany',
      'france',
      'china',
      'japan',
      'australia',
    ];

    return commonCountries.includes(trimmed.toLowerCase()) || /^[A-Z]{2}$/.test(trimmed);
  }

  /**
   * 验证地址格式
   */
  async validateFormat(
    address: string,
    countryCode?: string,
  ): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    try {
      const issues: string[] = [];
      const suggestions: string[] = [];

      // 基本验证
      if (!address || address.trim().length === 0) {
        issues.push('Address is empty');
        return { isValid: false, issues, suggestions };
      }

      // 解析地址
      const components = await this.parseAddress(address);

      // 检查必要组件
      if (!components.road && !components.house_number) {
        issues.push('Missing street information');
        suggestions.push('Include street name and number');
      }

      if (!components.city) {
        issues.push('Missing city information');
        suggestions.push('Include city name');
      }

      // 国家特定验证
      if (countryCode) {
        const countryIssues = this.validateCountrySpecificFormat(components, countryCode);
        issues.push(...countryIssues);
      }

      const isValid = issues.length === 0;

      return { isValid, issues, suggestions };
    } catch (error) {
      this.logger.error(`Format validation failed for: ${address}`, error.stack);
      return {
        isValid: false,
        issues: [`Validation error: ${error.message}`],
        suggestions: [],
      };
    }
  }

  /**
   * 国家特定格式验证
   */
  private validateCountrySpecificFormat(
    components: AddressComponents,
    countryCode: string,
  ): string[] {
    const issues: string[] = [];

    switch (countryCode.toUpperCase()) {
      case 'US':
        if (components.postcode && !/^\d{5}(-\d{4})?$/.test(components.postcode)) {
          issues.push('Invalid US postal code format');
        }
        if (!components.state) {
          issues.push('Missing state for US address');
        }
        break;

      case 'CA':
        if (components.postcode && !/^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(components.postcode)) {
          issues.push('Invalid Canadian postal code format');
        }
        break;

      case 'UK':
        if (components.postcode && !/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(components.postcode)) {
          issues.push('Invalid UK postal code format');
        }
        break;

      case 'DE':
        if (components.postcode && !/^\d{5}$/.test(components.postcode)) {
          issues.push('Invalid German postal code format');
        }
        break;
    }

    return issues;
  }

  /**
   * 批量格式化地址
   */
  async formatBatch(
    addresses: Array<{
      components: AddressComponents;
      countryCode?: string;
      options?: FormattingOptions;
    }>,
  ): Promise<Array<{ formatted: string; error?: string }>> {
    const results: Array<{ formatted: string; error?: string }> = [];

    for (const { components, countryCode, options } of addresses) {
      try {
        const formatted = await this.formatAddress(components, countryCode, options);
        results.push({ formatted });
      } catch (error) {
        results.push({
          formatted: '',
          error: error.message,
        });
      }
    }

    return results;
  }
}
