import { BaseDomainEvent } from '../../../common/domain/domain-event';

export interface UserRegisteredEventProps {
  userId: string;
  email: string;
  registeredAt: Date;
}

export class UserRegisteredEvent extends BaseDomainEvent {
  public readonly userId: string;
  public readonly email: string;
  public readonly registeredAt: Date;

  constructor(userId: string, email: string) {
    super(userId);
    this.userId = userId;
    this.email = email;
    this.registeredAt = new Date();
  }
}
