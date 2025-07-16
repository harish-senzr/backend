// // client.ts
// import { Connection, Client } from '@temporalio/client';
// import { myCronWorkflow } from './workflows/cron.workflow';

// async function run() {
//     const connection = await Connection.connect();

//     const client = new Client({ connection });
//     console.log("cron service ")

//     const handle = await client.workflow.start(myCronWorkflow, {
//         taskQueue: 'cron-task-queue',
//         workflowId: 'my-cron-workflow',
//         cronSchedule: '*/5 * * * * *',  // ✅ Every 5 seconds
//         args: [],
//     });

//     console.log(`✅ Cron workflow started with ID: ${handle.workflowId}`);
// }

// run().catch((err) => {
//     console.error(' Failed to start cron workflow:', err);
//     process.exit(1);
// });


// client.ts
import { Connection, Client } from '@temporalio/client';
import { myCronWorkflow } from './workflows/cron.workflow';

async function run() {
  const connection = await Connection.connect();
  const client = new Client({ connection });

  console.log('▶️ Starting workflow...');

  const handle = await client.workflow.start(myCronWorkflow, {
    taskQueue: 'cron-task-queue',
    workflowId: 'my-test-run1', 
    args: [],
  });

  console.log(`Workflow started with ID: ${handle.workflowId}`);
}

run().catch((err) => {
  console.error('Failed to start workflow:', err);
  process.exit(1);
});
