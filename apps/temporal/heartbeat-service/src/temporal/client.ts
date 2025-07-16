import { Connection, Client } from '@temporalio/client';
import { heartbeatWorkflow } from './workflows/heartbeat.workflow';

export const startHeartbeatWorkflow = async (data: any, mode: string) => {
  const connection = await Connection.connect();
  const client = new Client({ connection });

  await client.workflow.start(heartbeatWorkflow, {
    taskQueue: 'heartbeat-queue',
    workflowId: `heartbeat-${data.sn}-${Date.now()}`,
    args: [data, mode],
  });
};
