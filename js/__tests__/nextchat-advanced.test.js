import NextChatAdvanced from '../nextchat-advanced-optimized.js';

describe('NextChatAdvanced', () => {
  let chat;
  const mockContainer = document.createElement('div');
  
  beforeEach(() => {
    chat = new NextChatAdvanced({
      container: mockContainer,
      enableVoice: false,
      enableImage: false,
      autoInit: false,
    });
  });

  afterEach(() => {
    chat.destroy();
  });

  test('实例化', () => {
    expect(chat).toBeInstanceOf(NextChatAdvanced);
  });

  test('初始化', async () => {
    await chat.init();
    expect(chat.state.isInitialized).toBe(true);
  });

  test('发送消息', async () => {
    await chat.init();
    chat.elements.chatInput.value = '测试消息';
    await chat.sendMessage();
    expect(chat.messages.length).toBeGreaterThan(0);
  });

  test('销毁', () => {
    chat.destroy();
    expect(chat.state.isDestroyed).toBe(true);
  });
});