import { BaseDomainEvent } from '../../../common/domain/domain-event';

export interface UserCreatedEventProps {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
}

export class UserCreatedEvent extends BaseDomainEvent {
  public readonly userId: string;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly role: string;
  public readonly createdAt: Date;

  constructor(props: UserCreatedEventProps) {
    super(props.userId);
    this.userId = props.userId;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    this.createdAt = props.createdAt;
  }
}
