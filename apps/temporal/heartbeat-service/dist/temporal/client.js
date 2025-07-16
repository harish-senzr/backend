"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHeartbeatWorkflow = void 0;
const client_1 = require("@temporalio/client");
const heartbeat_workflow_1 = require("./workflows/heartbeat.workflow");
const startHeartbeatWorkflow = async (data, mode) => {
    const connection = await client_1.Connection.connect();
    const client = new client_1.Client({ connection });
    await client.workflow.start(heartbeat_workflow_1.heartbeatWorkflow, {
        taskQueue: 'heartbeat-queue',
        workflowId: `heartbeat-${data.sn}-${Date.now()}`,
        args: [data, mode],
    });
};
exports.startHeartbeatWorkflow = startHeartbeatWorkflow;
