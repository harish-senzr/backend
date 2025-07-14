// import { Connection, Client } from '@temporalio/client';
// import { heartbeatWorkflow, deviceWorkflow } from './workflow';

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



import { Connection, Client } from '@temporalio/client';
import { deviceWorkflow } from './workflow/device.workflow';

export const startWorkflow = async (data: any, mode: string) => {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });  const client = new Client({ connection });

  await client.workflow.start(deviceWorkflow, {
    taskQueue: 'device-queue',
    workflowId: `device-${data.employeeId || data.deviceId}-${Date.now()}`,
    args: [data, mode],
  });
};
