import { proxyActivities } from '@temporalio/workflow';
import * as activityImpl from '../activities/cron.activities';

const activities = proxyActivities<typeof activityImpl>({
  startToCloseTimeout: '60s',
});
export async function myCronWorkflow(): Promise<void> {
  console.log(`Cron started at ${new Date().toISOString()}`);
  // const tenants = await activities.getAllTenants();
  const tenants = ""
  if (tenants.length === 0) {
    console.log('No tenants found or failed to fetch tenants.');
    return;
  }
  for (const tenant of tenants) {
    const users: number[] = await activities.getUsersByTenant(tenant);
    const attendance: number[] = await activities.getAttendanceForPreviousDay(tenant);
    const absentees: number[] = users.filter(userId => !attendance.includes(userId));
    if (absentees.length > 0) {
      const absenteePayload = absentees.map(id => ({ id: String(id) }));
      await activities.markUsersAbsent(tenant, absenteePayload);
      console.log(`[${tenant}] Marked ${absentees.length} users as absent`);
    }
  }
}
