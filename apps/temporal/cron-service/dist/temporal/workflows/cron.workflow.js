"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myCronWorkflow = myCronWorkflow;
const workflow_1 = require("@temporalio/workflow");
const activities = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '60s',
});
async function myCronWorkflow() {
    console.log(`Cron started at ${new Date().toISOString()}`);
    // const tenants = await activities.getAllTenants();
    const tenants = "";
    if (tenants.length === 0) {
        console.log('No tenants found or failed to fetch tenants.');
        return;
    }
    for (const tenant of tenants) {
        const users = await activities.getUsersByTenant(tenant);
        const attendance = await activities.getAttendanceForPreviousDay(tenant);
        const absentees = users.filter(userId => !attendance.includes(userId));
        if (absentees.length > 0) {
            const absenteePayload = absentees.map(id => ({ id: String(id) }));
            await activities.markUsersAbsent(tenant, absenteePayload);
            console.log(`[${tenant}] Marked ${absentees.length} users as absent`);
        }
    }
}
