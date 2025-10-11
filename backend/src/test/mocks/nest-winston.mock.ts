import { winstonMock } from './winston.mock';

export const nestWinstonMock = {
  WinstonModule: {
    createLogger: jest.fn().mockReturnValue({
      module: 'WinstonModule',
      providers: [],
      exports: [],
      global: true,
    }),
    forRoot: jest.fn().mockReturnValue({
      module: 'WinstonModule',
      providers: [
        {
          provide: 'WINSTON_MODULE_PROVIDER',
          useValue: winstonMock.createLogger(),
        },
      ],
      exports: ['WINSTON_MODULE_PROVIDER'],
      global: true,
    }),
    forRootAsync: jest.fn().mockReturnValue({
      module: 'WinstonModule',
      imports: [],
      providers: [
        {
          provide: 'WINSTON_MODULE_PROVIDER',
          useValue: winstonMock.createLogger(),
        },
      ],
      exports: ['WINSTON_MODULE_PROVIDER'],
      global: true,
    }),
  },

  utilities: {
    createLogger: jest.fn().mockReturnValue(winstonMock.createLogger()),
    Logger: jest.fn().mockImplementation(() => winstonMock.createLogger()),
  },
};

export default nestWinstonMock;
