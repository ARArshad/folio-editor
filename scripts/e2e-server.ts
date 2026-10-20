import { isolatedServer } from './test-server';
const server = isolatedServer(3107);
async function shutdown() {
  await server.stop();
  server.cleanup();
  process.exit(0);
}
process.on('SIGTERM', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown();
});
await server.start();
console.log(`Isolated E2E server ready: ${server.url}`);
