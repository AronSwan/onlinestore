export const bcryptMock = {
  hash: jest.fn().mockImplementation((password: string, rounds: number) => {
    return Promise.resolve(`hashed_${password}_${rounds}`);
  }),

  compare: jest.fn().mockImplementation((password: string, hash: string) => {
    // 简单的模拟逻辑：如果hash包含password则返回true
    return Promise.resolve(hash.includes(password));
  }),

  genSalt: jest.fn().mockImplementation((rounds: number) => {
    return Promise.resolve(`salt_${rounds}_${Date.now()}`);
  }),

  getRounds: jest.fn().mockImplementation((hash: string) => {
    const match = hash.match(/_(\d+)_/);
    return match ? parseInt(match[1]) : 10;
  }),
};

export default bcryptMock;
