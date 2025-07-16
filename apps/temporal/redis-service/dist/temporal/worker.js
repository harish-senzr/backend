"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/worker.ts
const worker_1 = require("@temporalio/worker");
const activities = __importStar(require("./activities"));
const nats_1 = require("nats");
const client_1 = require("./client");
const sc = (0, nats_1.StringCodec)();
async function startTemporalWorker() {
    const worker = await worker_1.Worker.create({
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
    const nc = await (0, nats_1.connect)({ servers: natsUrl });
    const sub = nc.subscribe('attendance.events');
    console.log(`📡 Subscribed to 'attendance.events'`);
    for await (const msg of sub) {
        const payload = sc.decode(msg.data);
        console.log("📨 Received:", payload);
        try {
            const parsed = JSON.parse(payload);
            await (0, client_1.startRedisWorkflow)(parsed);
        }
        catch (err) {
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
    }
    catch (err) {
        console.error('❌ Worker or Subscriber failed:', err);
        process.exit(1);
    }
}
main();
