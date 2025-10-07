export interface DomainEvent {
  dateTimeOccurred: Date;
  aggregateId: string;
  eventVersion: number;
  markForDispatch(): void;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public dateTimeOccurred: Date;
  public aggregateId: string;
  public eventVersion: number;
  private _isMarkedForDispatch: boolean = false;

  constructor(aggregateId: string, eventVersion: number = 1) {
    this.dateTimeOccurred = new Date();
    this.aggregateId = aggregateId;
    this.eventVersion = eventVersion;
  }

  markForDispatch(): void {
    this._isMarkedForDispatch = true;
  }

  get isMarkedForDispatch(): boolean {
    return this._isMarkedForDispatch;
  }
}
