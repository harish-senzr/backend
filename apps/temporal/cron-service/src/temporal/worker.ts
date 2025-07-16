// worker.ts
import { Worker } from '@temporalio/worker';
import * as activities from './activities/cron.activities'; 
import * as workflows from './workflows/cron.workflow';

async function run() {
    console.log("client.ts")

  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows/cron.workflow'), 
    activities,
    taskQueue: 'cron-task-queue',
  });

  console.log('Worker started for cron-task-queue');
  await worker.run();
}

run().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
