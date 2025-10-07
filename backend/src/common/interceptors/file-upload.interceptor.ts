import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

// 声明 Express.Multer 类型
declare global {
  namespace Express {
    interface Request {
      file?: any;
      files?: any[];
    }
  }
}

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // 检查是否有文件上传
    if (request.file || request.files) {
      this.validateFile(request.file || request.files[0]);
    }

    return next.handle();
  }

  private validateFile(file: any): void {
    const files = Array.isArray(file) ? file : [file];

    for (const f of files) {
      // 文件类型验证
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'text/plain',
        'application/json',
      ];

      if (!allowedMimeTypes.includes(f.mimetype)) {
        throw new BadRequestException(
          `不支持的文件类型: ${f.mimetype}. 允许的类型: ${allowedMimeTypes.join(', ')}`,
        );
      }

      // 文件大小验证 (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (f.size > maxSize) {
        throw new BadRequestException(`文件大小超过限制. 最大允许: ${maxSize / 1024 / 1024}MB`);
      }

      // 文件名验证
      if (!f.originalname || f.originalname.length > 255) {
        throw new BadRequestException('无效的文件名');
      }

      // 检查文件名是否包含恶意字符
      if (this.containsMaliciousChars(f.originalname)) {
        throw new BadRequestException('文件名包含恶意字符');
      }

      // 检查文件扩展名
      const allowedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.svg',
        '.pdf',
        '.txt',
        '.json',
      ];

      const fileExtension = f.originalname.toLowerCase().split('.').pop();
      if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
        throw new BadRequestException(
          `不支持的文件扩展名: .${fileExtension}. 允许的扩展名: ${allowedExtensions.join(', ')}`,
        );
      }
    }
  }

  private containsMaliciousChars(filename: string): boolean {
    // 检查路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return true;
    }

    // 检查恶意文件名模式
    const maliciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /on\w+\s*=/i,
      /<\s*script/i,
      /<\s*iframe/i,
      /<\s*object/i,
      /<\s*embed/i,
      /<\s*link/i,
      /<\s*meta/i,
      /<\s*style/i,
      /<\s*title/i,
      /<\s*body/i,
      /<\s*html/i,
      /<\s*head/i,
      /<\s*form/i,
      /<\s*input/i,
      /<\s*button/i,
      /<\s*select/i,
      /<\s*textarea/i,
      /<\s*option/i,
      /<\s*optgroup/i,
      /<\s*table/i,
      /<\s*tr/i,
      /<\s*td/i,
      /<\s*th/i,
      /<\s*caption/i,
      /<\s*colgroup/i,
      /<\s*col/i,
      /<\s*tfoot/i,
      /<\s*thead/i,
      /<\s*tbody/i,
      /<\s*div/i,
      /<\s*span/i,
      /<\s*p/i,
      /<\s*h[1-6]/i,
      /<\s*br/i,
      /<\s*hr/i,
      /<\s*pre/i,
      /<\s*code/i,
      /<\s*blockquote/i,
      /<\s*ul/i,
      /<\s*ol/i,
      /<\s*li/i,
      /<\s*dl/i,
      /<\s*dt/i,
      /<\s*dd/i,
      /<\s*a/i,
      /<\s*img/i,
      /<\s*map/i,
      /<\s*area/i,
      /<\s*param/i,
      /<\s*source/i,
      /<\s*track/i,
      /<\s*video/i,
      /<\s*audio/i,
      /<\s*canvas/i,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(filename)) {
        return true;
      }
    }

    return false;
  }
}
