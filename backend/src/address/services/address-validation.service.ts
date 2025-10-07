import { Injectable, Logger } from '@nestjs/common';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions?: string[];
  components?: {
    hasStreet: boolean;
    hasCity: boolean;
    hasPostalCode: boolean;
    hasCountry: boolean;
  };
}

export interface AddressComponents {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

@Injectable()
export class AddressValidationService {
  private readonly logger = new Logger(AddressValidationService.name);

  // 常见的地址模式
  private readonly patterns = {
    // 邮政编码模式（按国家）
    postalCodes: {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
      UK: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
      DE: /^\d{5}$/,
      FR: /^\d{5}$/,
      CN: /^\d{6}$/,
      JP: /^\d{3}-\d{4}$/,
      AU: /^\d{4}$/,
    },

    // 街道号码模式
    streetNumber: /^\d+[A-Za-z]?/,

    // 常见的街道类型
    streetTypes: [
      'street',
      'st',
      'avenue',
      'ave',
      'road',
      'rd',
      'boulevard',
      'blvd',
      'lane',
      'ln',
      'drive',
      'dr',
      'court',
      'ct',
      'place',
      'pl',
      'way',
      'circle',
      'cir',
      'square',
      'sq',
      'trail',
      'tr',
    ],
  };

  /**
   * 验证完整地址
   */
  async validateAddress(address: string, countryCode?: string): Promise<ValidationResult> {
    try {
      this.logger.debug(`Validating address: ${address}`);

      const issues: string[] = [];
      const suggestions: string[] = [];
      let confidence = 1.0;

      // 基本检查
      if (!address || address.trim().length === 0) {
        return {
          isValid: false,
          confidence: 0,
          issues: ['Address is empty'],
        };
      }

      // 长度检查
      if (address.length < 5) {
        issues.push('Address is too short');
        confidence -= 0.3;
      }

      if (address.length > 200) {
        issues.push('Address is too long');
        confidence -= 0.2;
      }

      // 解析地址组件
      const components = this.parseAddressComponents(address);

      // 验证组件
      const componentValidation = this.validateComponents(components, countryCode);
      issues.push(...componentValidation.issues);
      suggestions.push(...componentValidation.suggestions);
      confidence *= componentValidation.confidence;

      // 特殊字符检查
      const specialCharValidation = this.validateSpecialCharacters(address);
      issues.push(...specialCharValidation.issues);
      confidence *= specialCharValidation.confidence;

      // 格式检查
      const formatValidation = this.validateFormat(address, countryCode);
      issues.push(...formatValidation.issues);
      suggestions.push(...formatValidation.suggestions);
      confidence *= formatValidation.confidence;

      const isValid = issues.length === 0 && confidence >= 0.7;

      this.logger.debug(`Address validation completed: ${isValid ? 'valid' : 'invalid'}`);

      return {
        isValid,
        confidence: Math.max(0, Math.min(1, confidence)),
        issues,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        components: {
          hasStreet: !!components.street,
          hasCity: !!components.city,
          hasPostalCode: !!components.postalCode,
          hasCountry: !!components.country,
        },
      };
    } catch (error) {
      this.logger.error(`Address validation failed for: ${address}`, error.stack);
      throw error;
    }
  }

  /**
   * 解析地址组件
   */
  private parseAddressComponents(address: string): AddressComponents {
    const components: AddressComponents = {};
    const parts = address.split(',').map(part => part.trim());

    // 简单的启发式解析
    for (const part of parts) {
      if (this.looksLikePostalCode(part)) {
        components.postalCode = part;
      } else if (this.looksLikeStreet(part)) {
        components.street = part;
      } else if (this.looksLikeCity(part)) {
        components.city = part;
      } else if (this.looksLikeCountry(part)) {
        components.country = part;
      }
    }

    return components;
  }

  /**
   * 验证地址组件
   */
  private validateComponents(
    components: AddressComponents,
    countryCode?: string,
  ): { issues: string[]; suggestions: string[]; confidence: number } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;

    // 检查必要组件
    if (!components.street) {
      issues.push('Missing street information');
      confidence -= 0.3;
      suggestions.push('Include street name and number');
    }

    if (!components.city) {
      issues.push('Missing city information');
      confidence -= 0.2;
      suggestions.push('Include city name');
    }

    // 验证邮政编码格式
    if (components.postalCode && countryCode) {
      const pattern =
        this.patterns.postalCodes[
          countryCode.toUpperCase() as keyof typeof this.patterns.postalCodes
        ];
      if (pattern && !pattern.test(components.postalCode)) {
        issues.push(`Invalid postal code format for ${countryCode}`);
        confidence -= 0.2;
        suggestions.push(`Use correct postal code format for ${countryCode}`);
      }
    }

    return { issues, suggestions, confidence };
  }

  /**
   * 验证特殊字符
   */
  private validateSpecialCharacters(address: string): { issues: string[]; confidence: number } {
    const issues: string[] = [];
    let confidence = 1.0;

    // 检查可疑字符
    const suspiciousChars = /[<>{}[\]\\|`~!@#$%^&*()+=]/;
    if (suspiciousChars.test(address)) {
      issues.push('Contains suspicious characters');
      confidence -= 0.3;
    }

    // 检查连续空格
    if (/\s{3,}/.test(address)) {
      issues.push('Contains excessive whitespace');
      confidence -= 0.1;
    }

    // 检查连续标点
    if (/[.,;:]{2,}/.test(address)) {
      issues.push('Contains consecutive punctuation');
      confidence -= 0.1;
    }

    return { issues, confidence };
  }

  /**
   * 验证地址格式
   */
  private validateFormat(
    address: string,
    countryCode?: string,
  ): { issues: string[]; suggestions: string[]; confidence: number } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;

    // 检查是否包含数字（街道号码）
    if (!/\d/.test(address)) {
      issues.push('Missing street number');
      confidence -= 0.2;
      suggestions.push('Include street number');
    }

    // 检查大小写
    if (address === address.toUpperCase()) {
      suggestions.push('Consider using proper case instead of all uppercase');
      confidence -= 0.1;
    }

    if (address === address.toLowerCase()) {
      suggestions.push('Consider using proper case instead of all lowercase');
      confidence -= 0.1;
    }

    // 检查常见缩写
    const hasStreetType = this.patterns.streetTypes.some(type =>
      address.toLowerCase().includes(type),
    );

    if (!hasStreetType) {
      suggestions.push('Consider including street type (St, Ave, Rd, etc.)');
      confidence -= 0.1;
    }

    return { issues, suggestions, confidence };
  }

  /**
   * 检查是否看起来像邮政编码
   */
  private looksLikePostalCode(text: string): boolean {
    return /^\d{3,6}(-\d{4})?$|^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(text.trim());
  }

  /**
   * 检查是否看起来像街道
   */
  private looksLikeStreet(text: string): boolean {
    const hasNumber = /^\d+/.test(text.trim());
    const hasStreetType = this.patterns.streetTypes.some(type => text.toLowerCase().includes(type));
    return hasNumber || hasStreetType;
  }

  /**
   * 检查是否看起来像城市
   */
  private looksLikeCity(text: string): boolean {
    // 简单启发式：不包含数字，长度适中
    const trimmed = text.trim();
    return (
      !/^\d/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50 && !/\d{3,}/.test(trimmed)
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

    return commonCountries.includes(trimmed.toLowerCase()) || /^[A-Z]{2}$/.test(trimmed); // 国家代码
  }

  /**
   * 标准化地址格式
   */
  async normalizeAddress(address: string): Promise<string> {
    try {
      let normalized = address.trim();

      // 移除多余空格
      normalized = normalized.replace(/\s+/g, ' ');

      // 标准化常见缩写
      const abbreviations = {
        street: 'St',
        avenue: 'Ave',
        road: 'Rd',
        boulevard: 'Blvd',
        lane: 'Ln',
        drive: 'Dr',
        court: 'Ct',
        place: 'Pl',
      };

      for (const [full, abbr] of Object.entries(abbreviations)) {
        const regex = new RegExp(`\\b${full}\\b`, 'gi');
        normalized = normalized.replace(regex, abbr);
      }

      // 首字母大写
      normalized = normalized.replace(
        /\b\w+/g,
        word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      );

      return normalized;
    } catch (error) {
      this.logger.error(`Address normalization failed for: ${address}`, error.stack);
      return address;
    }
  }

  /**
   * 批量验证地址
   */
  async validateBatch(
    addresses: Array<{ address: string; countryCode?: string }>,
  ): Promise<Array<{ address: string; validation: ValidationResult }>> {
    const results: Array<{ address: string; validation: ValidationResult }> = [];

    for (const { address, countryCode } of addresses) {
      try {
        const validation = await this.validateAddress(address, countryCode);
        results.push({ address, validation });
      } catch (error) {
        results.push({
          address,
          validation: {
            isValid: false,
            confidence: 0,
            issues: [`Validation error: ${error.message}`],
          },
        });
      }
    }

    return results;
  }
}
