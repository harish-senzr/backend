import { Worker } from '@temporalio/worker';
import * as heartbeatActivities from './activities/heartbeat.activities';
import { listenToNats } from './subscriber';

async function run() {
  await listenToNats();

  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows/heartbeat.workflow.ts'),
    activities: heartbeatActivities,
    taskQueue: 'heartbeat-queue',
  });

  await worker.run();
}
run();
