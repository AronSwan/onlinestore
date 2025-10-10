import { redisMock } from './redis.mock';

export const nestjsRedisMock = {
  RedisModule: {
    forRoot: jest.fn().mockReturnValue({
      module: 'RedisModule',
      providers: [],
      exports: [],
      global: true,
    }),
    forRootAsync: jest.fn().mockReturnValue({
      module: 'RedisModule',
      imports: [],
      providers: [],
      exports: [],
      global: true,
    }),
  },
  
  RedisService: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockReturnValue(redisMock.createClient()),
    ping: jest.fn().mockResolvedValue('PONG'),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    keys: jest.fn().mockResolvedValue([]),
    flushdb: jest.fn().mockResolvedValue('OK'),
    hget: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    hdel: jest.fn().mockResolvedValue(1),
    hexists: jest.fn().mockResolvedValue(0),
    hgetall: jest.fn().mockResolvedValue({}),
    hkeys: jest.fn().mockResolvedValue([]),
    hvals: jest.fn().mockResolvedValue([]),
    hlen: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(-1),
    incrby: jest.fn().mockResolvedValue(1),
    decrby: jest.fn().mockResolvedValue(-1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
  })),
};

export default nestjsRedisMock;