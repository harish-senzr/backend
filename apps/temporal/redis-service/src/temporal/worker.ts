// src/worker.ts
import { Worker } from '@temporalio/worker';
import * as activities from './activities';
import { connect, StringCodec } from 'nats';
import { startRedisWorkflow } from './client';

const sc = StringCodec();

async function startTemporalWorker() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflow.ts'),
    activities,
    taskQueue: 'redis-queue',
  });

  console.log('✅ Redis Temporal Worker is running...');
  await worker.run();
}

async function startNatsSubscriber() {
  console.log(`📡 Subscribed to 'attendance.events'`);
        const natsUrl = process.env.NATS_URL;


    const nc = await connect({ servers: natsUrl });
  const sub = nc.subscribe('attendance.events');
  console.log(`📡 Subscribed to 'attendance.events'`);

  for await (const msg of sub) {
    const payload = sc.decode(msg.data);
    console.log("📨 Received:", payload);

    try {
      const parsed = JSON.parse(payload);
      await startRedisWorkflow(parsed);
    } catch (err) {
      console.error("❌ Failed to handle message:", err);
    }
  }
}

// 🔁 Start both in parallel
async function main() {
  try {
    await Promise.all([
      startTemporalWorker(),
      startNatsSubscriber(),
    ]);
  } catch (err) {
    console.error('❌ Worker or Subscriber failed:', err);
    process.exit(1);
  }
}

main();
