import * as bcrypt from 'bcrypt';

export interface UserCredentialsProps {
  email: string;
  passwordHash: string;
  salt?: string;
}

export class UserCredentials {
  private readonly props: UserCredentialsProps;

  constructor(props: UserCredentialsProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get salt(): string | undefined {
    return this.props.salt;
  }

  public static async create(email: string, plainPassword: string): Promise<UserCredentials> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    return new UserCredentials({
      email,
      passwordHash,
    });
  }

  public async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.props.passwordHash);
  }

  public async changePassword(newPlainPassword: string): Promise<UserCredentials> {
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPlainPassword, saltRounds);

    return new UserCredentials({
      ...this.props,
      passwordHash: newPasswordHash,
    });
  }

  public equals(other: UserCredentials): boolean {
    return (
      this.props.email === other.props.email && this.props.passwordHash === other.props.passwordHash
    );
  }

  private validateProps(props: UserCredentialsProps): void {
    if (!props.email || props.email.trim().length === 0) {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.email)) {
      throw new Error('Invalid email format');
    }

    if (!props.passwordHash || props.passwordHash.trim().length === 0) {
      throw new Error('Password hash is required');
    }
  }
}
