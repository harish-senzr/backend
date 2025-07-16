"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listenToNats = void 0;
const nats_1 = require("nats");
const client_1 = require("./client");
const sc = (0, nats_1.StringCodec)();
const listenToNats = async () => {
    console.log("Starting NATS listener...");
    const natsUrl = process.env.NATS_URL;
    // const nc = await connect({ servers: "nats://192.168.1.49:4222" });
    const nc = await (0, nats_1.connect)({ servers: natsUrl });
    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();
    // Ensure the stream exists or silently skip if it already exists
    try {
        await jsm.streams.add({
            name: 'ATTENDANCE',
            subjects: ['attendance.*'],
            storage: nats_1.StorageType.File,
        });
        console.log('Stream created: ATTENDANCE');
    }
    catch (err) {
        if (err.message?.includes('stream name already in use') ||
            err.message?.includes('subjects overlap') ||
            err.code === 400) {
            console.log('ATTENDANCE stream already exists, skipping creation.');
        }
        else {
            console.error('Error checking/creating stream:', err);
            throw err;
        }
    }
    // Subscribe to each mode subject
    const modes = ['heartbeat'];
    for (const mode of modes) {
        try {
            const subject = `attendance.${mode}`;
            const opts = (0, nats_1.consumerOpts)();
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
                        if (mode === 'heartbeat') {
                            console.log(` Heartbeat from device: ${data.sn}`);
                        }
                        await (0, client_1.startHeartbeatWorkflow)(data, mode);
                        m.ack();
                    }
                    catch (err) {
                        console.error(`[${mode}] Error:`, err.message);
                        console.error(`[${mode}]  Raw message:`, sc.decode(m.data));
                        // Don't ack to allow retry
                    }
                }
            })();
        }
        catch (err) {
            console.error(`Could not subscribe to attendance.${mode}:`, err);
        }
    }
};
exports.listenToNats = listenToNats;
