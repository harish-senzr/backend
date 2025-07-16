"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Express + NATS bridge (Node.js + TypeScript)
const express_1 = __importDefault(require("express"));
const nats_1 = require("nats");
const app = (0, express_1.default)();
app.use(express_1.default.json());
let nc;
async function start() {
    nc = await (0, nats_1.connect)({ servers: 'nats://localhost:4222' });
    app.post('/nats/publish', async (req, res) => {
        console.log("req.body", req.body);
        const data = req.body;
        try {
            console.log("hello from the index.ts");
            await nc.publish('attendance.events', JSON.stringify(data));
            res.send({ message: '✅ Published to NATS' });
        }
        catch (error) {
            console.error('❌ NATS publish failed:', error);
            res.status(500).send({ message: 'Failed to publish' });
        }
    });
    app.listen(4000, () => {
        console.log('HTTP-NATS bridge running on http://localhost:4000');
    });
}
start().catch((err) => {
    console.error('❌ Failed to start NATS bridge:', err);
});
