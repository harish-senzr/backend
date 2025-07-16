import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { getPersonalModuleData, updateRedis } = proxyActivities<typeof activities>({
  startToCloseTimeout: '20 seconds',
});

export async function redisWorkflow(payload: { employeeId: number | string }) {
  console.log(`[redisWorkflow] Triggered with ID: ${payload.employeeId}`);
  const data = await getPersonalModuleData(payload.employeeId);
  const employeePayload = data;
  await updateRedis(data);
}
