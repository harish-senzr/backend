"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRedisWorkflow = startRedisWorkflow;
const client_1 = require("@temporalio/client");
async function startRedisWorkflow(input) {
    const connection = await client_1.Connection.connect();
    const client = new client_1.Client({ connection });
    await client.workflow.start('redisWorkflow', {
        taskQueue: 'redis-queue',
        workflowId: `emp-${input.payload?.employeeId || Date.now()}`,
        args: [input],
    });
    console.log(' Workflow started for employee:', input.payload?.employeeId);
}
