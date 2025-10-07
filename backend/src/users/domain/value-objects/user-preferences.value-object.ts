export interface UserPreferencesProps {
  language: string;
  timezone: string;
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showPhone: boolean;
  };
}

export class UserPreferences {
  private readonly props: UserPreferencesProps;

  constructor(props: UserPreferencesProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  get language(): string {
    return this.props.language;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get currency(): string {
    return this.props.currency;
  }

  get notifications(): UserPreferencesProps['notifications'] {
    return { ...this.props.notifications };
  }

  get theme(): UserPreferencesProps['theme'] {
    return this.props.theme;
  }

  get privacy(): UserPreferencesProps['privacy'] {
    return { ...this.props.privacy };
  }

  public static createDefault(): UserPreferences {
    return new UserPreferences({
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      theme: 'auto',
      privacy: {
        profileVisible: true,
        showEmail: false,
        showPhone: false,
      },
    });
  }

  public updatePreferences(updates: Partial<UserPreferencesProps>): UserPreferences {
    return new UserPreferences({
      ...this.props,
      ...updates,
      notifications: {
        ...this.props.notifications,
        ...(updates.notifications || {}),
      },
      privacy: {
        ...this.props.privacy,
        ...(updates.privacy || {}),
      },
    });
  }

  public equals(other: UserPreferences): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  private validateProps(props: UserPreferencesProps): void {
    if (!props.language || props.language.trim().length === 0) {
      throw new Error('Language is required');
    }

    if (!props.timezone || props.timezone.trim().length === 0) {
      throw new Error('Timezone is required');
    }

    if (!props.currency || props.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }

    if (!['light', 'dark', 'auto'].includes(props.theme)) {
      throw new Error('Invalid theme value');
    }

    if (!props.notifications) {
      throw new Error('Notifications preferences are required');
    }

    if (!props.privacy) {
      throw new Error('Privacy preferences are required');
    }
  }
}
