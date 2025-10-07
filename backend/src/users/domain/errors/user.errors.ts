/**
 * 用户领域错误类，基于PrestaShop异常处理模式
 * 提供结构化的错误处理和错误代码
 */

export class UserConstraintException extends Error {
  public readonly errorCode: string;
  public readonly timestamp: Date;

  constructor(message: string, errorCode: string) {
    super(message);
    this.name = 'UserConstraintException';
    this.errorCode = errorCode;
    this.timestamp = new Date();

    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserConstraintException);
    }
  }

  /**
   * 转换为JSON格式
   */
  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class UserNotFoundException extends Error {
  public readonly userId: string;
  public readonly timestamp: Date;

  constructor(userId: string, message?: string) {
    super(message || `User with ID ${userId} not found`);
    this.name = 'UserNotFoundException';
    this.userId = userId;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserNotFoundException);
    }
  }
}

export class UserAlreadyExistsException extends Error {
  public readonly email: string;
  public readonly timestamp: Date;

  constructor(email: string, message?: string) {
    super(message || `User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsException';
    this.email = email;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserAlreadyExistsException);
    }
  }
}

export class InvalidUserOperationException extends Error {
  public readonly operation: string;
  public readonly reason: string;
  public readonly timestamp: Date;

  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid operation ${operation}: ${reason}`);
    this.name = 'InvalidUserOperationException';
    this.operation = operation;
    this.reason = reason;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidUserOperationException);
    }
  }
}
