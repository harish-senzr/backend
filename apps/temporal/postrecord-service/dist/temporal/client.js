"use strict";
// import { Connection, Client } from '@temporalio/client';
// import { heartbeatWorkflow, deviceWorkflow } from './workflow';
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorkflow = void 0;
// export const startWorkflow = async (data: any, mode: string) => {
//   console.log("inside the workflow", data, mode);
//   const connection = await Connection.connect();
//   const client = new Client({ connection });
//   let workflowFn;
//   let workflowName;
//   if (mode === 'heartbeat') {
//     workflowFn = heartbeatWorkflow;
//     workflowName = 'heartbeatWorkflow';
//   } else {
//     workflowFn = deviceWorkflow;
//     workflowName = 'deviceWorkflow';
//   }
//   console.log(`🚀 Starting ${workflowName} for mode: ${mode}`);
//   await client.workflow.start(workflowFn, {
//     taskQueue: 'main-queue',
//     workflowId: `${workflowName}-${data.employeeId || data.deviceId}-${Date.now()}`,
//     args: [data, mode],
//   });
// };
const client_1 = require("@temporalio/client");
const device_workflow_1 = require("./workflow/device.workflow");
const startWorkflow = async (data, mode) => {
    const connection = await client_1.Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });
    const client = new client_1.Client({ connection });
    await client.workflow.start(device_workflow_1.deviceWorkflow, {
        taskQueue: 'device-queue',
        workflowId: `device-${data.employeeId || data.deviceId}-${Date.now()}`,
        args: [data, mode],
    });
};
exports.startWorkflow = startWorkflow;
