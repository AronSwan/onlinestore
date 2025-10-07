import { BaseDomainEvent } from '../../../common/domain/domain-event';

export interface UserActivatedEventProps {
  userId: string;
  activatedAt: Date;
}

export class UserActivatedEvent extends BaseDomainEvent {
  public readonly userId: string;
  public readonly activatedAt: Date;

  constructor(props: UserActivatedEventProps) {
    super(props.userId);
    this.userId = props.userId;
    this.activatedAt = props.activatedAt;
  }
}
