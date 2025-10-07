import { BaseDomainEvent } from '../../../common/domain/domain-event';

export interface UserPasswordChangedEventProps {
  userId: string;
  changedAt: Date;
}

export class UserPasswordChangedEvent extends BaseDomainEvent {
  public readonly userId: string;
  public readonly changedAt: Date;

  constructor(props: UserPasswordChangedEventProps) {
    super(props.userId);
    this.userId = props.userId;
    this.changedAt = props.changedAt;
  }
}
