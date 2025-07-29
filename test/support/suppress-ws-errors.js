// Suppress WebSocket reconnection errors after tests complete
process.on('uncaughtException', (err) => {
  if (err.code === 'ERR_UNHANDLED_ERROR' && err.message.includes('ECONNREFUSED')) {
    // Ignore WebSocket reconnection errors after test server shuts down
    return;
  }
  throw err;
});

process.on('unhandledRejection', (reason) => {
  if (reason && reason.code === 'ECONNREFUSED') {
    // Ignore connection refused errors
    return;
  }
  throw reason;
});