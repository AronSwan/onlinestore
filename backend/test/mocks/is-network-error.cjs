module.exports = jest.fn((error) => {
  if (!error) return false;
  
  // 检查常见的网络错误代码
  const networkErrorCodes = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNABORTED',
    'ETIMEDOUT',
    'ENETDOWN',
    'ENETUNREACH',
    'ENETRESET'
  ];
  
  // 检查错误代码
  if (error.code && networkErrorCodes.includes(error.code)) {
    return true;
  }
  
  // 检查 HTTP 状态码
  if (error.response) {
    const status = error.response.status;
    // 5xx 服务器错误和某些 4xx 错误可能是网络问题
    return status >= 500 || status === 408;
  }
  
  // 检查错误消息
  const errorMessage = error.message || '';
  const networkErrorPatterns = [
    /network/i,
    /timeout/i,
    /connection/i,
    /fetch/i,
    /socket/i
  ];
  
  return networkErrorPatterns.some(pattern => pattern.test(errorMessage));
});