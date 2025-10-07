export interface UserProfileProps {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
}

export class UserProfile {
  private readonly props: UserProfileProps;

  constructor(props: UserProfileProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get email(): string {
    return this.props.email;
  }

  get phone(): string | undefined {
    return this.props.phone;
  }

  get avatar(): string | undefined {
    return this.props.avatar;
  }

  get bio(): string | undefined {
    return this.props.bio;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  public updateProfile(updates: Partial<UserProfileProps>): UserProfile {
    return new UserProfile({
      ...this.props,
      ...updates,
    });
  }

  public equals(other: UserProfile): boolean {
    return (
      this.props.firstName === other.props.firstName &&
      this.props.lastName === other.props.lastName &&
      this.props.email === other.props.email &&
      this.props.phone === other.props.phone &&
      this.props.avatar === other.props.avatar &&
      this.props.bio === other.props.bio
    );
  }

  private validateProps(props: UserProfileProps): void {
    if (!props.firstName || props.firstName.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (!props.lastName || props.lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }

    if (!props.email || props.email.trim().length === 0) {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.email)) {
      throw new Error('Invalid email format');
    }

    if (props.phone && props.phone.trim().length > 0) {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(props.phone)) {
        throw new Error('Invalid phone format');
      }
    }
  }
}
