"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heartbeatWorkflow = heartbeatWorkflow;
// workflows/heartbeat.workflow.ts
const workflow_1 = require("@temporalio/workflow");
const { verifyDevice, storeHeartbeat } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '10s',
});
async function heartbeatWorkflow(payload, mode) {
    //  "body": {
    //   "active_info": "actived",
    //   "algo_name": "",
    //   "device_name": "",
    //   "device_version": "_20250703_1618",
    //   "msg_type": "heartbeat",
    //   "password": "cc5d6dd379674f118a3e8bcbfc1c356f",
    //   "sn": "d11245b301ebf140",
    //   "timestamp": "20250703180925"
    // }
    console.log("inside the  heartbeat workflow");
    const deviceSN = payload.sn;
    const isValid = await verifyDevice(deviceSN);
    if (!isValid) {
        throw new Error(`Device ${deviceSN} not found`);
    }
    await storeHeartbeat(payload);
    return 'Heartbeat stored successfully';
}
