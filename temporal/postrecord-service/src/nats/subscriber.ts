import {
  connect,
  JSONCodec,
  consumerOpts,
  AckPolicy,
  StorageType,
} from 'nats';
import { startWorkflow } from '../temporal/client';

const jc = JSONCodec();

export const listenToNats = async () => {
  console.log("🔄 Starting NATS listener...");

  const nc = await connect({ servers: "localhost:4222" });

  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  // Ensure stream exists with full wildcard
  try {
    await jsm.streams.info('ATTENDANCE');
    console.log('✅ ATTENDANCE stream already exists');
  } catch (err: any) {
    if (err.code === '404' || err.message?.includes('stream not found')) {
      console.log('⚙️ Creating ATTENDANCE stream...');
      await jsm.streams.add({
        name: 'ATTENDANCE',
        subjects: ['attendance.>'],
        storage: StorageType.File,
      });
      console.log('✅ Stream created: ATTENDANCE');
    } else {
      console.error(' Error checking/creating stream:', err);
      throw err;
    }
  }

  // Subjects to subscribe to
  const subjects = [
    'attendance.app',
    'attendance.face',
    'attendance.rfid',
    'attendance.heartbeat',
    'attendance.device',
  ];

  for (const subject of subjects) {
    const mode = subject.split('.')[1];

    try {
      console.log(`🔁 Subscribing to: ${subject}`);

      const opts = consumerOpts();
      opts.durable(`durable-${mode}`);
      opts.manualAck();
      opts.ackExplicit();
      opts.deliverTo(`inbox-${mode}`);

      const sub = await js.subscribe(subject, opts);

      (async () => {
        console.log(`🎧 Listening on subject: ${subject} (push mode)`);

        for await (const m of sub) {
          try {
            const data: any = jc.decode(m.data);
            console.log(`[${mode}] Received:`, data);

            if (mode === 'heartbeat') {
              console.log(`Heartbeat from device: ${data.deviceId}`);
            } else {
              console.log(`[${mode}] Triggering workflow`);
              await startWorkflow(data, mode);
            }

            m.ack();
          } catch (err) {
            console.error(`[${mode}] ❌ Error processing message:`, err);
          }
        }
      })();
    } catch (err) {
      console.error(`❌ Could not subscribe to ${subject}:`, err);
    }
  }
};
