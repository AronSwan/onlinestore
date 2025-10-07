import { BaseDomainEvent } from '../../../common/domain/domain-event';

export interface UserDeactivatedEventProps {
  userId: string;
  deactivatedAt: Date;
  reason?: string;
}

export class UserDeactivatedEvent extends BaseDomainEvent {
  public readonly userId: string;
  public readonly deactivatedAt: Date;
  public readonly reason?: string;

  constructor(props: UserDeactivatedEventProps) {
    super(props.userId);
    this.userId = props.userId;
    this.deactivatedAt = props.deactivatedAt;
    this.reason = props.reason;
  }
}
