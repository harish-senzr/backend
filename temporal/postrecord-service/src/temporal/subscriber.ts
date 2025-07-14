import {
  connect,
  StringCodec,
  consumerOpts,
  AckPolicy,
  StorageType,
} from 'nats';
import { startWorkflow } from './client';

const sc = StringCodec();

export const listenToNats = async () => {
    const natsUrl = process.env.NATS_URL;

  console.log("Starting NATS listener...");

  // const nc = await connect({ servers: "nats://192.168.1.49:4222" });
  const nc = await connect({ servers: natsUrl });
    if (!natsUrl) {
    throw new Error('NATS_URL not defined in environment variables');
  }

  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  // Ensure the stream exists or silently skip if it already exists
  try {
    await jsm.streams.add({
      name: 'ATTENDANCE',
      subjects: ['attendance.*'],
      storage: StorageType.File,
    });
    console.log('Stream created: ATTENDANCE');
  } catch (err: any) {
    if (
      err.message?.includes('stream name already in use') ||
      err.message?.includes('subjects overlap') ||
      err.code === 400
    ) {
      console.log('ATTENDANCE stream already exists, skipping creation.');
    } else {
      console.error('Error checking/creating stream:', err);
      throw err;
    }
  }

  // Subscribe to each mode subject
  const modes = ['app', 'face', 'rfid',] as const;

  for (const mode of modes) {
    try {
      const subject = `attendance.${mode}`;
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
            const raw = sc.decode(m.data);
            const data = JSON.parse(raw); // Safe parse for CLI-published strings
            console.log(` [${mode}] Received:`, data);

            // if (mode === 'heartbeat') {
            //   console.log(` Heartbeat from device: ${data.sn}`);
            // }

            await startWorkflow(data, mode);
            m.ack();
          } catch (err: any) {
            console.error(`[${mode}] Error:`, err.message);
            console.error(`[${mode}]  Raw message:`, sc.decode(m.data));
          }
        }
      })();
    } catch (err) {
      console.error(`Could not subscribe to attendance.${mode}:`, err);
    }
  }
};
