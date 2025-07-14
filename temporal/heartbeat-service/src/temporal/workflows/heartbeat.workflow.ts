// workflows/heartbeat.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/heartbeat.activities';

const { verifyDevice, storeHeartbeat } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10s',
});

export async function heartbeatWorkflow(payload: any,mode:string): Promise<string> {


  //  "body": {
  //   "active_info": "actived",
  //   "algo_name": "",
  //   "device_name": "",
  //   "device_version": "_20250703_1618",
  //   "msg_type": "heartbeat",
  //   "password": "cc5d6dd379674f118a3e8bcbfc1c356f",
  //   "sn": "d11245b301ebf140",
  //   "timestamp": "20250703180925"
  // }

  console.log("inside the  heartbeat workflow")
  const deviceSN = payload.sn;

  const isValid = await verifyDevice(deviceSN);
  if (!isValid) {
    throw new Error(`Device ${deviceSN} not found`);
  }

  await storeHeartbeat(payload);
  return 'Heartbeat stored successfully';
}
