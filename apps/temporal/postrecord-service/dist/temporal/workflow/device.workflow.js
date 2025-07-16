"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceWorkflow = deviceWorkflow;
const workflow_1 = require("@temporalio/workflow");
const { prepareData, checkIfEmpty, getShiftConfigByEmployeeId, getMondayShiftDetails, calculateLateBy, insertAttendance, 
// processShiftData,
// validateDevice,
// findEmployeeViaAssignedUser,
// checkHoliday,
// getAssignedShifts,
// // getClosestShift,
// getAssignedHolidays,
// insertAttendance,
getAttendanceRecord, validateMode } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '10s',
});
let finalPayload;
async function deviceWorkflow(payload, mode) {
    console.log("before the prepare data");
    const crtPayload = await prepareData(payload);
    console.log(crtPayload);
    const checkAllowedMode = await validateMode(crtPayload);
    console.log(checkAllowedMode);
    if (!checkAllowedMode.isValid) {
        console.warn(`Workflow stopped: ${checkAllowedMode.message}`);
        return;
    }
    console.log("Mode is valid. Proceeding with next steps...");
    if (crtPayload.action === "in") {
        const attendanceRecords = await getAttendanceRecord(crtPayload.employeeId, crtPayload.date, crtPayload.tenant);
        console.log("hello attendance", attendanceRecords);
        // const result = await checkIfEmpty(attendanceRecords);
        // console.log(result)
        if (attendanceRecords.length === 0) {
            console.log("📥 No attendance record found. Proceed to insert.");
            try {
                const shift = await getShiftConfigByEmployeeId(crtPayload.employeeId);
                const shiftDetails = await getMondayShiftDetails(shift);
                const entryTime = shiftDetails[0]?.entryTime;
                const lateBy = await calculateLateBy(entryTime, crtPayload.timeStamp, crtPayload.date);
                const payload = {
                    employeeId: crtPayload.employeeId,
                    attendance: "present",
                    tenant: crtPayload.tenant,
                    mode: crtPayload.mode,
                    date: crtPayload.date,
                    inTime: crtPayload.timeStamp,
                    onTime: crtPayload.timeStamp,
                    lateBy: lateBy,
                    uniqueId: crtPayload.uniqueId,
                };
                await insertAttendance(payload);
                console.log("✅ Insert success");
            }
            catch (err) {
                console.error("❌ Insertion failed:", err.message || err);
                throw new Error("❌ Attendance insertion failed. Aborting process.");
            }
        }
        else {
            console.warn("⚠️ Attendance already exists. Skipping insert.");
        }
    }
    else {
        console.log("hello from the out else ");
        console.log("inside else ", crtPayload);
        const payload = {
            outTime: crtPayload.timeStamp,
            mode: crtPayload.mode,
            // workHours: "",
            // earlyDeparture: "",
            uniqueId: crtPayload.uniqueId,
            // overTime: "",
            action: crtPayload.action,
        };
        console.log(payload);
        await insertAttendance(payload);
        console.log("updated");
    }
    // const device = await validateDevice(payload.sn);
    // if (!device) throw new Error('Device not found or unauthorized');
    // const user = await findEmployeeViaAssignedUser(payload);
    // console.log(user)
    // if (!user) throw new Error('User not found for given UUID');
    // const isHoliday = await checkHoliday(payload, user.tenant);
    // console.log("holiday checked", isHoliday)
    // const shifts = await getAssignedShifts();
    // // const matchedShift = await getClosestShift(payload.time, shifts);
    // // if (!matchedShift) throw new Error('No matching shift found');
    // const holidayList = await getAssignedHolidays(user.tenant);
    // const [rawDate, time] = payload.time.split(' ');
    // const date = rawDate.replace(/\//g, '-');
    // // Step 7: Check existing attendance
    // const existingRecord = await getAttendanceRecord(user.employee.employeeId, date, user.tenant);
    // console.log("helllllllll", existingRecord)
    // // if (existingRecord) {
    // //   console.log('Attendance already recorded');
    // //   return;
    // // }
    // // Step 8: Insert attendance record
    // // const [rawDate, time] = payload.time.split(' ');
    // // const date = rawDate.replace(/\//g, '-');
    // finalPayload = {
    //   action: device,
    //   tenant: user.tenant,
    //   employeeId: user.employee.employeeId,
    //   isHoliday: isHoliday,
    //   shifts: shifts,
    //   status: device,
    //   time: time,
    //   date: date,
    //   mode: "face"
    // }
    // console.log("final ", finalPayload, existingRecord)
    // const insert = await insertAttendance(finalPayload, existingRecord);
    // console.log(insert)
    console.log('Attendance inserted successfully');
}
