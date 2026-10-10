/**
 * 通知域 provider 配置错误（双盲审 P2 整改——原注释/spec 提及但类不存在）
 *
 * 触发：SMS_PROVIDER/PUSH_PROVIDER 配置了非 none 值但对应 SDK 未接入。
 * 时机：首次 send 调用时（非启动期——被 processNotification catch 转
 * NotificationStatus.FAILED，应用不挂；文档勘误见 BACKLOG 双盲审整改批）。
 */
export class ProviderNotConfiguredError extends Error {
  constructor(
    readonly channel: 'sms' | 'push',
    readonly provider: string,
  ) {
    super(
      `${channel.toUpperCase()} provider '${provider}' SDK 未接入——BACKLOG 挂账:通知域集成刀补刀`,
    );
    this.name = 'ProviderNotConfiguredError';
  }
}
