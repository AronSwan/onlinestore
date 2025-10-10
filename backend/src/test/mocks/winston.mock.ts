export const winstonMock = {
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
    log: jest.fn(),
    profile: jest.fn(),
    startTimer: jest.fn().mockReturnValue({
      done: jest.fn(),
    }),
    stream: {
      write: jest.fn(),
    },
    query: jest.fn().mockResolvedValue([]),
    close: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  }),
  
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    simple: jest.fn(),
    printf: jest.fn(),
    label: jest.fn(),
    errors: jest.fn(),
    metadata: jest.fn(),
    colorize: jest.fn(),
    align: jest.fn(),
    padLevels: jest.fn(),
    ms: jest.fn(),
    uncolorize: jest.fn(),
    cli: jest.fn(),
  },
  
  transports: {
    Console: jest.fn().mockImplementation(() => ({
      name: 'console',
      level: 'info',
      silent: false,
      colorize: false,
      timestamp: false,
      log: jest.fn(),
      close: jest.fn(),
    })),
    File: jest.fn().mockImplementation(() => ({
      name: 'file',
      filename: 'test.log',
      level: 'info',
      silent: false,
      log: jest.fn(),
      close: jest.fn(),
    })),
    Stream: jest.fn().mockImplementation(() => ({
      name: 'stream',
      stream: {
        write: jest.fn(),
      },
      level: 'info',
      silent: false,
      log: jest.fn(),
      close: jest.fn(),
    })),
  },
  
  
  addColors: jest.fn(),
  loggers: new Map(),
  exceptionHandlers: {
    handle: jest.fn(),
  },
  rejectionHandlers: {
    handle: jest.fn(),
  },
  default: {
    exceptionHandlers: {
      handle: jest.fn(),
    },
    rejectionHandlers: {
      handle: jest.fn(),
    },
  },
};

export default winstonMock;