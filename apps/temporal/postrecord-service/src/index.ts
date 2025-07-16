// Express + NATS bridge (Node.js + TypeScript)
import express from 'express';
import { connect, NatsConnection } from 'nats';

const app = express();
app.use(express.json());

let nc: NatsConnection;

async function start() {
  nc = await connect({ servers: 'nats://localhost:4222' });

  app.post('/nats/publish', async (req, res) => {
    console.log("req.body",req.body)
    const data = req.body;
    try {
      console.log("hello from the index.ts")
      await nc.publish('attendance.events', JSON.stringify(data));
      res.send({ message: '✅ Published to NATS' });
    } catch (error) {
      console.error('NATS publish failed:', error);
      res.status(500).send({ message: 'Failed to publish' });
    }
  });

  app.listen(4000, () => {
    console.log('HTTP-NATS bridge running on http://localhost:4000');
  });
}

start().catch((err) => {
  console.error('Failed to start NATS bridge:', err);
});
