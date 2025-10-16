const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { CONFIG } = require('../shared/config');
const { SecurityError, ERROR_CODES } = require('../shared/error-handler');

const execAsync = promisify(exec);

/**
 * Windows ACL管理器
 * 专门处理Windows系统的文件权限和安全设置
 */
class WindowsACLManager {
  constructor() {
    this.isWindows = CONFIG.isWindows;
    this.aclEnabled = CONFIG.windowsACLEnabled;
    this.defaultOwner = CONFIG.windowsACLOwner;

    if (this.isWindows && this.aclEnabled) {
      console.log('Windows ACL管理器已启用');
    } else if (this.isWindows) {
      console.log('Windows ACL管理器已禁用（通过配置）');
    } else {
      console.log('Windows ACL管理器不适用于当前平台');
    }
  }

  /**
   * 保护密钥文件
   * @param {string} basePath - 密钥文件基础路径（不含扩展名）
   * @returns {Promise<Object>} 保护结果
   */
  async secureKeyFiles(basePath) {
    if (!this.isWindows || !this.aclEnabled) {
      return { secured: false, reason: 'Windows ACL未启用' };
    }

    try {
      const publicKeyPath = `${basePath}.pub`;
      const privateKeyPath = `${basePath}.key`;

      // 检查文件是否存在
      await this.verifyFileExists(publicKeyPath);
      await this.verifyFileExists(privateKeyPath);

      const results = {
        publicKey: await this.secureFile(publicKeyPath),
        privateKey: await this.secureFile(privateKeyPath),
      };

      console.log(`Windows ACL保护完成: ${basePath}`);

      return {
        secured: true,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_005', '密钥文件ACL保护失败', {
        originalError: error,
        basePath,
      });
    }
  }

  /**
   * 保护单个文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 保护结果
   */
  async secureFile(filePath) {
    if (!this.isWindows || !this.aclEnabled) {
      return { secured: false, reason: 'Windows ACL未启用' };
    }

    try {
      // 验证文件存在
      await this.verifyFileExists(filePath);

      const steps = [];

      // 1. 设置文件所有者
      const ownerResult = await this.setFileOwner(filePath, this.defaultOwner);
      steps.push(ownerResult);

      // 2. 重置权限（移除继承）
      const resetResult = await this.resetFilePermissions(filePath);
      steps.push(resetResult);

      // 3. 设置管理员完全控制
      const adminResult = await this.grantFullControl(filePath, 'Administrators');
      steps.push(adminResult);

      // 4. 设置系统完全控制
      const systemResult = await this.grantFullControl(filePath, 'SYSTEM');
      steps.push(systemResult);

      // 5. 移除其他用户的权限
      const removeResult = await this.removeOtherUsersPermissions(filePath);
      steps.push(removeResult);

      // 6. 验证权限设置
      const verifyResult = await this.verifyFileSecurity(filePath);
      steps.push(verifyResult);

      return {
        secured: true,
        filePath,
        steps,
        verified: verifyResult.isSecure,
      };
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_005', '文件ACL保护失败', {
        originalError: error,
        filePath,
      });
    }
  }

  /**
   * 验证文件安全性
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 验证结果
   */
  async verifyFileSecurity(filePath) {
    if (!this.isWindows) {
      return { isSecure: true, reason: '非Windows平台' };
    }

    try {
      // 获取文件ACL信息
      const aclInfo = await this.getFileACL(filePath);

      let isSecure = true;
      const issues = [];

      // 检查所有者
      if (!aclInfo.owner.includes('Administrators') && !aclInfo.owner.includes('SYSTEM')) {
        isSecure = false;
        issues.push('文件所有者不是Administrators或SYSTEM');
      }

      // 检查权限
      const allowedPrincipals = ['Administrators', 'SYSTEM'];
      for (const permission of aclInfo.permissions) {
        if (!allowedPrincipals.includes(permission.principal)) {
          isSecure = false;
          issues.push(`发现未授权主体: ${permission.principal}`);
        }
      }

      // 检查是否允许其他用户访问
      if (
        aclInfo.permissions.some(
          p =>
            p.principal === 'Users' ||
            p.principal === 'Everyone' ||
            p.principal === 'Authenticated Users',
        )
      ) {
        isSecure = false;
        issues.push('发现其他用户组权限');
      }

      return {
        isSecure,
        issues,
        aclInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        isSecure: false,
        issues: [`ACL验证失败: ${error.message}`],
        error: error.message,
      };
    }
  }

  /**
   * 修复文件权限
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 修复结果
   */
  async repairFilePermissions(filePath) {
    if (!this.isWindows || !this.aclEnabled) {
      return { repaired: false, reason: 'Windows ACL未启用' };
    }

    try {
      // 首先验证当前安全性
      const securityCheck = await this.verifyFileSecurity(filePath);

      if (securityCheck.isSecure) {
        return {
          repaired: false,
          reason: '文件已安全，无需修复',
          securityCheck,
        };
      }

      // 执行修复
      const repairSteps = [];

      // 1. 获取当前权限备份
      const originalACL = await this.getFileACL(filePath);
      repairSteps.push({
        step: 'backup_original_acl',
        status: 'completed',
        data: originalACL,
      });

      // 2. 重置权限
      await this.resetFilePermissions(filePath);
      repairSteps.push({
        step: 'reset_permissions',
        status: 'completed',
      });

      // 3. 重新设置安全权限
      const secureResult = await this.secureFile(filePath);
      repairSteps.push({
        step: 'reapply_security',
        status: 'completed',
        data: secureResult,
      });

      // 4. 验证修复结果
      const finalCheck = await this.verifyFileSecurity(filePath);
      repairSteps.push({
        step: 'final_verification',
        status: finalCheck.isSecure ? 'passed' : 'failed',
        data: finalCheck,
      });

      return {
        repaired: true,
        originalIssues: securityCheck.issues,
        repairSteps,
        finalSecurity: finalCheck,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_005', '文件权限修复失败', {
        originalError: error,
        filePath,
      });
    }
  }

  /**
   * 批量保护目录
   * @param {string} directory - 目录路径
   * @param {Array} filePatterns - 文件模式
   * @returns {Promise<Object>} 批量保护结果
   */
  async secureDirectory(directory, filePatterns = ['*.key', '*.pub']) {
    if (!this.isWindows || !this.aclEnabled) {
      return { secured: false, reason: 'Windows ACL未启用' };
    }

    try {
      const results = {
        totalFiles: 0,
        secured: 0,
        failed: 0,
        details: [],
      };

      // 遍历目录中的文件
      const files = await this.findFilesByPattern(directory, filePatterns);
      results.totalFiles = files.length;

      for (const file of files) {
        try {
          const result = await this.secureFile(file);
          results.details.push({
            file,
            status: 'secured',
            result,
          });
          results.secured++;
        } catch (error) {
          results.details.push({
            file,
            status: 'failed',
            error: error.message,
          });
          results.failed++;
        }
      }

      console.log(`目录保护完成: ${directory}, 成功: ${results.secured}, 失败: ${results.failed}`);

      return results;
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_005', '目录保护失败', {
        originalError: error,
        directory,
      });
    }
  }

  /**
   * 获取系统ACL状态报告
   * @returns {Promise<Object>} ACL状态报告
   */
  async getACLStatusReport() {
    if (!this.isWindows) {
      return {
        platform: 'non-windows',
        aclEnabled: false,
        message: 'ACL功能仅适用于Windows平台',
      };
    }

    try {
      const keyDirStatus = await this.verifyFileSecurity(CONFIG.keysDir);
      const trustDirStatus = await this.verifyFileSecurity(CONFIG.trustStoreDir);

      // 检查icacls命令可用性
      const icaclsAvailable = await this.checkICACLSAvailability();

      return {
        platform: 'windows',
        aclEnabled: this.aclEnabled,
        icaclsAvailable,
        directories: {
          keys: keyDirStatus,
          trust: trustDirStatus,
        },
        configuration: {
          defaultOwner: this.defaultOwner,
          aclEnabled: this.aclEnabled,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        platform: 'windows',
        aclEnabled: this.aclEnabled,
        error: `状态报告生成失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ========== 私有方法 ==========

  /**
   * 验证文件存在
   */
  async verifyFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_006', '文件不存在', {
        filePath,
        originalError: error,
      });
    }
  }

  /**
   * 设置文件所有者
   */
  async setFileOwner(filePath, owner) {
    try {
      const command = `icacls "${filePath}" /setowner "${owner}" /T /C`;
      await execAsync(command);

      return {
        step: 'set_owner',
        status: 'completed',
        owner,
        command,
      };
    } catch (error) {
      return {
        step: 'set_owner',
        status: 'failed',
        error: error.message,
        owner,
        command: `icacls "${filePath}" /setowner "${owner}" /T /C`,
      };
    }
  }

  /**
   * 重置文件权限
   */
  async resetFilePermissions(filePath) {
    try {
      // 首先重置权限并禁用继承
      const command1 = `icacls "${filePath}" /inheritance:r /T /C`;
      await execAsync(command1);

      return {
        step: 'reset_permissions',
        status: 'completed',
        commands: [command1],
      };
    } catch (error) {
      return {
        step: 'reset_permissions',
        status: 'failed',
        error: error.message,
        commands: [`icacls "${filePath}" /inheritance:r /T /C`],
      };
    }
  }

  /**
   * 授予完全控制权限
   */
  async grantFullControl(filePath, principal) {
    try {
      const command = `icacls "${filePath}" /grant:r "${principal}:(F)" /T /C`;
      await execAsync(command);

      return {
        step: `grant_full_control_${principal.toLowerCase()}`,
        status: 'completed',
        principal,
        permission: 'F', // Full control
        command,
      };
    } catch (error) {
      return {
        step: `grant_full_control_${principal.toLowerCase()}`,
        status: 'failed',
        error: error.message,
        principal,
        command: `icacls "${filePath}" /grant:r "${principal}:(F)" /T /C`,
      };
    }
  }

  /**
   * 移除其他用户权限
   */
  async removeOtherUsersPermissions(filePath) {
    try {
      // 移除Users组权限（如果存在）
      const command1 = `icacls "${filePath}" /remove:g "Users" /T /C`;
      await execAsync(command1).catch(() => {}); // 忽略错误，可能不存在

      // 移除Everyone组权限（如果存在）
      const command2 = `icacls "${filePath}" /remove:g "Everyone" /T /C`;
      await execAsync(command2).catch(() => {}); // 忽略错误，可能不存在

      // 移除Authenticated Users组权限（如果存在）
      const command3 = `icacls "${filePath}" /remove:g "Authenticated Users" /T /C`;
      await execAsync(command3).catch(() => {}); // 忽略错误，可能不存在

      return {
        step: 'remove_other_users',
        status: 'completed',
        commands: [command1, command2, command3],
      };
    } catch (error) {
      return {
        step: 'remove_other_users',
        status: 'partial',
        error: error.message,
        commands: [
          `icacls "${filePath}" /remove:g "Users" /T /C`,
          `icacls "${filePath}" /remove:g "Everyone" /T /C`,
          `icacls "${filePath}" /remove:g "Authenticated Users" /T /C`,
        ],
      };
    }
  }

  /**
   * 获取文件ACL信息
   */
  async getFileACL(filePath) {
    try {
      const command = `icacls "${filePath}"`;
      const { stdout } = await execAsync(command);

      return this.parseICACLSOutput(stdout, filePath);
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_001', '获取文件ACL失败', {
        originalError: error,
        filePath,
      });
    }
  }

  /**
   * 解析icacls命令输出
   */
  parseICACLSOutput(output, filePath) {
    const lines = output.split('\n').filter(line => line.trim());
    const aclInfo = {
      filePath,
      owner: '',
      permissions: [],
      rawOutput: output,
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 解析所有者行
      if (trimmedLine.startsWith(filePath)) {
        const ownerMatch = trimmedLine.match(/\\\\([^\\]+)\\([^)]+)\)/);
        if (ownerMatch) {
          aclInfo.owner = `${ownerMatch[1]}\\${ownerMatch[2]}`;
        }
      }

      // 解析权限行
      if (trimmedLine.includes(':(')) {
        const permissionMatch = trimmedLine.match(/(.+):\((.+)\)/);
        if (permissionMatch) {
          const principal = permissionMatch[1].trim();
          const permissions = permissionMatch[2].split(',').map(p => p.trim());

          aclInfo.permissions.push({
            principal,
            permissions,
            fullLine: trimmedLine,
          });
        }
      }
    }

    return aclInfo;
  }

  /**
   * 检查icacls命令可用性
   */
  async checkICACLSAvailability() {
    try {
      await execAsync('icacls /?');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 按模式查找文件
   */
  async findFilesByPattern(directory, patterns) {
    const files = [];

    try {
      const dirEntries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of dirEntries) {
        if (entry.isFile()) {
          for (const pattern of patterns) {
            if (this.matchPattern(entry.name, pattern)) {
              files.push(path.join(directory, entry.name));
              break;
            }
          }
        }
      }
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_001', '目录读取失败', {
        originalError: error,
        directory,
      });
    }

    return files;
  }

  /**
   * 匹配文件模式
   */
  matchPattern(filename, pattern) {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }
}

module.exports = WindowsACLManager;
