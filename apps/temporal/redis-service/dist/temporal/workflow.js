"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisWorkflow = redisWorkflow;
const workflow_1 = require("@temporalio/workflow");
const { getPersonalModuleData, updateRedis } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '20 seconds',
});
async function redisWorkflow(payload) {
    console.log(`[redisWorkflow] Triggered with ID: ${payload.employeeId}`);
    const data = await getPersonalModuleData(payload.employeeId);
    const employeePayload = data;
    await updateRedis(data);
}
