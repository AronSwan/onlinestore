export class UserId {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  public static generate(): UserId {
    return new UserId(Math.floor(Math.random() * 1000000) + 1);
  }

  public static create(value: number): UserId {
    if (value <= 0) {
      throw new Error('User ID must be a positive number');
    }
    return new UserId(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }
}
