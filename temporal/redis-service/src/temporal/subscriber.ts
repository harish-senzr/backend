// src/nats-subscriber.ts
import { connect, StringCodec } from 'nats';
import { startRedisWorkflow } from './client';

const sc = StringCodec();

async function startSubscriber() {
      const natsUrl = process.env.NATS_URL;

  // const nc = await connect({ servers: 'nats://localhost:4222' });
    const nc = await connect({ servers: natsUrl });

  const sub = nc.subscribe('attendance.events');
  console.log(`Subscribed to 'attendance.events'`);

  for await (const msg of sub) {
    const payload = sc.decode(msg.data);
    console.log(" Received:", payload);

    try {
      const parsed = JSON.parse(payload);
      await startRedisWorkflow(parsed);
    } catch (err) {
      console.error("Failed to handle message:", err);
    }
  }
}

startSubscriber().catch(console.error);
