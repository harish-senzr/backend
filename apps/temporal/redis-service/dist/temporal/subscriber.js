"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/nats-subscriber.ts
const nats_1 = require("nats");
const client_1 = require("./client");
const sc = (0, nats_1.StringCodec)();
async function startSubscriber() {
    const natsUrl = process.env.NATS_URL;
    // const nc = await connect({ servers: 'nats://localhost:4222' });
    const nc = await (0, nats_1.connect)({ servers: natsUrl });
    const sub = nc.subscribe('attendance.events');
    console.log(`Subscribed to 'attendance.events'`);
    for await (const msg of sub) {
        const payload = sc.decode(msg.data);
        console.log(" Received:", payload);
        try {
            const parsed = JSON.parse(payload);
            await (0, client_1.startRedisWorkflow)(parsed);
        }
        catch (err) {
            console.error("Failed to handle message:", err);
        }
    }
}
startSubscriber().catch(console.error);
