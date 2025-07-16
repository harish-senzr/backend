import { Connection, Client } from '@temporalio/client';

export async function startRedisWorkflow(input: any) {
  const connection = await Connection.connect();
  const client = new Client({ connection });

  await client.workflow.start('redisWorkflow', {
    taskQueue: 'redis-queue',
    workflowId: `emp-${input.payload?.employeeId || Date.now()}`,
    args: [input],
  });

  console.log(' Workflow started for employee:', input.payload?.employeeId);
}
