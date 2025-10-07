import { BaseDomainEvent } from '../../../common/domain/domain-event';

export interface UserProfileUpdatedEventProps {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  updatedAt: Date;
}

export class UserProfileUpdatedEvent extends BaseDomainEvent {
  public readonly userId: string;
  public readonly email?: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly phone?: string;
  public readonly updatedAt: Date;

  constructor(props: UserProfileUpdatedEventProps) {
    super(props.userId);
    this.userId = props.userId;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.phone = props.phone;
    this.updatedAt = props.updatedAt;
  }
}
