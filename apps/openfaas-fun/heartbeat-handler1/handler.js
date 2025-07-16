const { connect, StringCodec } = require('nats');
const jwt = require('jsonwebtoken');
const fs = require('fs');


// const NATS_URL = process.env.NATS_URL || 'nats://192.168.1.49:4222';
const NATS_URL = fs.readFileSync('/var/openfaas/secrets/NATS_URL', 'utf8').trim();

const NATS_SUBJECT =  'attendance.heartbeat';
const STREAM_NAME =  'attendance';
const JWT_SECRET ='e4f3a93b4c41b3d6f94f19a7a1c9fcb8a3c734c6cd7416c3a64fbd09b2b71523e24f3a93b4c41b3d6f94f19a7a1c9fcb8a3c734c6cd7416c3a64fbd09b2b71523';

module.exports = async (event, context) => {
  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return context.status(401).succeed({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);

    const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const nc = await connect({ servers: NATS_URL });
    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();
    const sc = StringCodec();

    try {
      await jsm.streams.info(STREAM_NAME);
    } catch (err) {
      if (err.code === '404' || err.message?.includes('stream not found')) {
        try {
          await jsm.streams.add({
            name: STREAM_NAME,
            subjects: ['attendance.*'],
            storage: 'file',
            retention: 'limits',
          });
        } catch (createErr) {
          if (!createErr.message?.includes('subjects overlap with an existing stream')) {
            return context.status(500).succeed({
              message: `Failed to create stream '${STREAM_NAME}'`,
              error: createErr.message,
            });
          }
        }
      } else {
        return context.status(500).succeed({
          message: `Stream check failed`,
          error: err.message,
        });
      }
    }

    const ack = await js.publish(NATS_SUBJECT, sc.encode(JSON.stringify(payload)));
    await nc.drain();

    return context.status(200).succeed({
      message: 'Published successfully to JetStream',
      subject: NATS_SUBJECT,
      sequence: ack.seq,
    });

  } catch (err) {
    return context.status(500).succeed({
      message: 'Internal Server Error',
      error: err.code || err.message || 'Unknown error',
    });
  }
};
