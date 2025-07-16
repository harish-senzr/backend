// // worker.ts
// import { Worker } from '@temporalio/worker';
// import * as heartbeatActivities from './activities/heartbeat.activities';
// import * as deviceActivities from './activities/device.activities';
// import { listenToNats } from './subscriber';

// async function run() {
//    await listenToNats();
//   const worker = await Worker.create({
//     // Point to a directory or list of workflow files
//     workflowsPath: require.resolve('./workflow/index.ts'),
//     activities: {
//       ...heartbeatActivities,
//       ...deviceActivities,
//     },
//     taskQueue: 'main-queue', 
//   });

//   console.log('👷 Worker listening on main-queue for heartbeat and attendance workflows...');
//   await worker.run();
// }

// run();



import { Worker } from '@temporalio/worker';
import * as deviceActivities from './activities/device.activities';
import { listenToNats } from './subscriber';

async function run() {
  await listenToNats();

  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflow/device.workflow.ts'),
    activities: deviceActivities,
    taskQueue: 'device-queue',
  });

  await worker.run();
}
run();
