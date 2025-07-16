"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareData = prepareData;
exports.validateMode = validateMode;
exports.getAttendanceRecord = getAttendanceRecord;
exports.checkIfEmpty = checkIfEmpty;
exports.getShiftConfigByEmployeeId = getShiftConfigByEmployeeId;
exports.getMondayShiftDetails = getMondayShiftDetails;
exports.calculateLateBy = calculateLateBy;
exports.calculateWorkHours = calculateWorkHours;
exports.calculateEarlyDeparture = calculateEarlyDeparture;
exports.insertAttendance = insertAttendance;
const axios_1 = __importDefault(require("axios"));
// const BASE_URL = 'http://localhost:8056';
// const TOKEN = "AzCVH0EuknN7bXL33CRgXPFexljTjY9w"
const BASE_URL = process.env.BASE_URL || 'http://localhost:8056'; // fallback optional
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
async function prepareData(payload) {
    try {
        console.log("Inside prepareData");
        const { sn, time } = payload;
        const personUuid = payload.data?.[0]?.person_uuid;
        const [rawDate, timeStamp] = time.split(' ');
        const date = rawDate.replace(/\//g, '-');
        const headers = { Authorization: `Bearer ${DIRECTUS_TOKEN}` };
        const controllerUrl = `${BASE_URL}/items/controllers?filter[sn][_eq]=${sn}`;
        const controllerRes = await axios_1.default.get(controllerUrl, { headers });
        const controller = controllerRes.data?.data?.[0];
        const employeeIdDevice = payload.data?.[0]?.id_card_no || "";
        console.log("hello from inside po", employeeIdDevice);
        if (!controller) {
            console.warn(`Controller not found for SN: ${sn}`);
            return null;
        }
        console.log("hello from inside po");
        if (controller.status?.toLowerCase() !== 'approved') {
            console.warn(`Controller status is not approved: ${controller.status}`);
            return null;
        }
        console.log("hello from inside po");
        let attendanceMode = controller.attendanceMode;
        const cleanUuid = personUuid.replace(/[{}]/g, '');
        console.log("hello from inside po", cleanUuid);
        const userRes = await axios_1.default.get(`${BASE_URL}/items/personalModule`, {
            headers,
            params: {
                filter: {
                    employeeId: {
                        _eq: employeeIdDevice
                    }
                }
            }
        });
        const personalModule = userRes.data?.data[0];
        console.log("hello from inside po", personalModule);
        if (!personalModule) {
            console.warn(`User not found with person_uuid: ${personUuid}`);
            return null;
        }
        console.log(personalModule.assignedUser);
        const assignedUserRes = await axios_1.default.get(`${BASE_URL}/users/${personalModule.assignedUser}`, { headers });
        const assignedUser = assignedUserRes.data?.data;
        if (!assignedUser) {
            console.warn(`Assigned user not found with ID: ${personalModule.assignedUser}`);
            return null;
        }
        console.log(controller);
        let action = attendanceMode;
        // console.lo
        if (attendanceMode === 'InOut') {
            console.log("hello from the prepare inout");
            const logsUrl = `${BASE_URL}/items/logs?filter[employeeId][_eq]=${personalModule.id}&filter[date][_eq]=${date}`;
            const logsRes = await axios_1.default.get(logsUrl, { headers });
            const previousLogs = logsRes.data?.data || [];
            console.log(`Found ${previousLogs.length} logs for employee ${personalModule.id} on ${date}`);
            action = previousLogs.length > 0 ? 'out' : 'in';
            attendanceMode = 'InOut';
        }
        const finalPayload = {
            tenant: controller.tenant,
            msgType: "post_offine_record",
            sn,
            date,
            timeStamp,
            employeeIdDevice,
            employeeId: personalModule.id,
            employeeName: `${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim() || 'Unknown',
            name: assignedUser.first_name || "Unknown",
            mode: 'face',
            base64Data: '',
            personUuid,
            rfid: personalModule.rfid || "000000",
            status: attendanceMode,
            action,
            inRange: true,
            uniqueId: `${controller.tenant}-${date || 'undefined'}`
        };
        const response = await axios_1.default.post(`${BASE_URL}/items/logs`, finalPayload, {
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`
            }
        });
        console.log('✅ logs inserted:', response.data);
        return finalPayload;
    }
    catch (error) {
        console.error("Failed to prepare data:", error.response?.data || error.message);
        return null;
    }
}
async function validateMode(payload) {
    try {
        const allowedModes = ["face", "rfid"];
        const currentMode = payload?.mode || "";
        console.log("gggg", payload);
        console.log(currentMode);
        if (!allowedModes.includes(currentMode)) {
            return {
                isValid: false,
                message: "Access denied: Invalid entry mode",
                allowedModes,
                currentMode
            };
        }
        return {
            isValid: true,
            message: "Access granted",
            mode: currentMode
        };
    }
    catch (error) {
        return {
            isValid: false,
            message: `Validation error: ${error.message}`,
            allowedModes: [],
            currentMode: null
        };
    }
}
async function getAttendanceRecord(employeeId, date, tenant) {
    try {
        const url = `${BASE_URL}/items/attendance?filter[employeeId][_eq]=${employeeId}&filter[date][_eq]=${date}&filter[tenant][_eq]=${tenant}`;
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`
            }
        });
        const records = response.data?.data || [];
        console.log(` Found ${records.length} attendance record(s) for employee ${employeeId} on ${date} (tenant: ${tenant})`);
        return records;
    }
    catch (error) {
        console.error("Failed to fetch attendance record:", error.response?.data || error.message);
        return [];
    }
}
async function checkIfEmpty(data) {
    const bodyContent = data || [];
    if (!bodyContent || bodyContent.length === 0) {
        return { isEmpty: true };
    }
    return { isEmpty: false, data: bodyContent };
}
async function getShiftConfigByEmployeeId(employeeId) {
    try {
        const fieldsQuery = ["employeeId", "id", "assignedUser.first_name", "config.id", "config.configName", "attendanceSettings.id", "attendanceSettings.monJ", "attendanceSettings.tueJ", "attendanceSettings.wedJ", "attendanceSettings.thuJ", "attendanceSettings.friJ", "attendanceSettings.satJ", "attendanceSettings.sunJ", "attendanceSettings.isMonday", "attendanceSettings.isTuesday", "attendanceSettings.isWednesday", "attendanceSettings.isThursday", "attendanceSettings.isFriday", "attendanceSettings.isSaturday", "attendanceSettings.isSunday", "holidaySettingsJ", "config.attendancePolicies.entryTimeLimit", "config.attendancePolicies.setEntryTimeLimit", "config.attendancePolicies.lateEntryAllowed", "config.attendancePolicies.lateComingType", "config.attendancePolicies.LateCommingDayMode", "config.attendancePolicies.lateEntryPenaltyAmt"
        ];
        const url = `${BASE_URL}/items/personalModule/${employeeId}?fields=${fieldsQuery}`;
        console.log("📥 Shift config URL:", url);
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`
            }
        });
        const data = response.data?.data;
        console.log("✅ Shift Data:", data);
        return data;
    }
    catch (error) {
        console.error("❌ Failed to fetch shift config:", error.response?.data || error.message);
        return null;
    }
}
async function getMondayShiftDetails(data) {
    try {
        const monJShifts = data?.attendanceSettings?.monJ?.shifts || [];
        if (monJShifts.length === 0) {
            console.log("No Monday shifts assigned.");
            return [];
        }
        const shiftDetails = await Promise.all(monJShifts.map(async (shiftId) => {
            try {
                const url = `${BASE_URL}/items/shifts/${shiftId}`;
                const response = await axios_1.default.get(url, {
                    headers: {
                        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                    },
                });
                return response.data?.data;
            }
            catch (error) {
                console.error(`❌ Error fetching shift ${shiftId}:`, error.response?.data || error.message);
                return null;
            }
        }));
        const validShifts = shiftDetails.filter((s) => s !== null);
        console.log("✅ Monday Shift Details:", validShifts);
        return validShifts;
    }
    catch (err) {
        console.error("❌ Failed to fetch Monday shift details:", err.message);
        return [];
    }
}
async function calculateLateBy(shiftEntryTime, punchTime, date) {
    const punchDateTime = new Date(`${date}T${punchTime}`);
    const shiftDateTime = new Date(`${date}T${shiftEntryTime}`);
    const diffMs = punchDateTime.getTime() - shiftDateTime.getTime();
    if (diffMs <= 0)
        return null;
    // Return the formatted punch time (e.g., "12:07 AM")
    return punchDateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
}
function calculateWorkHours(inTime, outTime) {
    try {
        if (!inTime || !outTime)
            return null;
        const [inH, inM, inS] = inTime.split(':').map(Number);
        const [outH, outM, outS] = outTime.split(':').map(Number);
        const inDate = new Date(0, 0, 0, inH, inM, inS || 0);
        const outDate = new Date(0, 0, 0, outH, outM, outS || 0);
        let diffMs = outDate.getTime() - inDate.getTime();
        if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000;
        }
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        // Format: HH:MM:SS
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    catch (error) {
        console.error("❌ Error calculating work hours:", error);
        return null;
    }
}
// export async function processShiftData(data: any): Promise<{
//   isEmpty: boolean;
//   data?: any[];
//   error?: string;
// }> {
//   console.log("inside the process",data)
//   const bodyContent = data
//   console.log("inside the process")
//   const todayDate = data.date||null;
//   console.log("inside the process")
//   if (!bodyContent.length) {
//     return { isEmpty: true };
//   }
//   console.log("inside the process")
//   if (!todayDate) {
//     return { isEmpty: true, error: "No date provided" };
//   }
//   console.log("inside the process")
//   const istDate = new Date(
//     new Date(todayDate).toLocaleString("en-US", {
//       timeZone: "Asia/Kolkata",
//     })
//   );
//   console.log("inside the process")
//   const dayIndex = istDate.getDay();
//   console.log("day",dayIndex)
//   const weekdayMap = ["sunJ", "monJ", "tueJ", "wedJ", "thuJ", "friJ", "satJ"] as const;
//   const weekdayBoolMap = [
//     "isSunday",
//     "isMonday",
//     "isTuesday",
//     "isWednesday",
//     "isThursday",
//     "isFriday",
//     "isSaturday",
//   ] as const;
//   const todayKey = weekdayMap[dayIndex];
//   const todayBoolKey = weekdayBoolMap[dayIndex];
//   const modifiedData = bodyContent.map((item: any) => {
//     const config = item.config || {};
//     const attendance = item.attendanceSettings || {};
//     const policies = config.attendancePolicies || {};
//     const todayShifts = attendance?.[todayKey]?.shifts || [];
//     const isWeekOff = !!attendance?.[todayBoolKey];
//     const holidays = item.holidaySettingsJ?.holidays || [];
//     return {
//       employeeId: item.employeeId,
//       id: item.id,
//       assignedUser: item.assignedUser,
//       todayShiftIds: todayShifts,
//       holidays,
//       attendancePolicies: policies,
//       configId: config.id,
//       configName: config.configName,
//       dayKey: todayKey,
//       weekOffStatus: isWeekOff,
//     };
//   });
//   console.log("modified",modifiedData)
//   return {
//     isEmpty: false,
//     data: modifiedData,
//   };
// }
// export async function validateDevice(sn: string): Promise<string | null> {
//   const URL = `http://localhost:8056/items/controllers?filter[sn][_eq]=${sn}&fields[]=status&fields[]=attendanceMode`;
//   console.log("🔍 Verifying device using SN via URL:", URL);
//   try {
//     const response = await axios.get(URL, {
//       headers: {
//         Authorization: `Bearer ${TOKEN}` // or your token string
//       }
//     });
//     const device = response.data?.data?.[0];
//     if (!device) {
//       console.log(" No device found with SN:", sn);
//       return null;
//     }
//     if (device.status !== "approved") {
//       console.log(" Device found but not approved. Status:", device.status);
//       return null;
//     }
//     console.log(" Device approved. Attendance mode:", device.attendanceMode);
//     return device.attendanceMode;
//   } catch (error: any) {
//     console.error("Failed to validate device:", error.response?.data || error.message);
//     return null;
//   }
// }
// export async function findEmployeeViaAssignedUser(payload: any): Promise<any> {
//   try {
//     const rawUUID = payload.data?.[0]?.person_uuid;
//     if (!rawUUID) throw new Error('Missing person_uuid in payload');
//     const userId = rawUUID.replace(/[{}]/g, '');
//     // 🔹 Step 1: Get user details
//     const userUrl = `${BASE_URL}/users?filter[id][_eq]=${userId}`;
//     http://localhost:8056/users?ff147988b-82ba-4906-a010-083a089e570e
//     console.log(userUrl)
//     const userRes = await axios.get(userUrl, {
//       headers: { Authorization: `Bearer ${TOKEN}` },
//     });
//     const user = userRes.data?.data[0];
//     if (!user) throw new Error(`User not found: ${userId}`);
//     console.log("USER1010", user)
//     const tenantId = user.tenant;
//     console.log(tenantId)
//     if (!tenantId) throw new Error('Tenant ID not found in user record');
//     // 🔹 Step 2: Query personalModule by assignedUser
//     const personalUrl = `${BASE_URL}/items/personalModule?filter[assignedUser][_eq]=${userId}`;
//     console.log(personalUrl)
//     const personalRes = await axios.get(personalUrl, {
//       headers: { Authorization: `Bearer ${TOKEN}` },
//     });
//     const employee = personalRes.data?.data?.[0];
//     if (!employee) throw new Error(`No personalModule found for user: ${userId}`);
//     console.log("✅ Found personalModule:", employee);
//     return {
//       tenant: tenantId,
//       employee
//     };
//   } catch (error: any) {
//     console.error('❌ Error fetching personalModule:', error.response?.data || error.message);
//     throw new Error('Failed to find employee via assigned user');
//   }
// }
// export async function checkHoliday(payload: any, tenant: string): Promise<boolean> {
//   try {
//     console.log(payload, tenant)
//     const punchDate = payload?.data?.[0]?.time // e.g. "2025/07/03"
//     console.log("1010", punchDate)
//     if (!punchDate) throw new Error('Invalid punch date in payload');
//     const formattedDate = punchDate.replace(/\//g, '-'); // Convert to "2025-07-03"
//     const response = await axios.get(`${BASE_URL}/items/holiday`, {
//       params: {
//         filter: {
//           date: { _eq: formattedDate },
//           tenant: { _eq: tenant }
//         }
//       },
//       headers: {
//         Authorization: `Bearer ${TOKEN}`
//       }
//     });
//     console.log("inside holifdat", response.data)
//     return response.data?.data?.length > 0; // True if it is a holiday
//   } catch (error: any) {
//     console.error('Error checking holiday:', error.response?.data || error.message);
//     throw new Error('Failed to check holiday');
//   }
// }
// export async function getAssignedShifts() {
//   try {
//     const response = await axios.get('http://localhost:8056/items/shifts', {
//       params: {
//         fields: [
//           'id',
//           'shift',
//           'entryTime',
//           'exitTime',
//           'break',
//           'tenant'
//         ]
//       },
//       headers: {
//         Authorization: `Bearer ${TOKEN}`,
//       },
//     });
//     const shift = response.data.data?.[0];
//     if (!shift) throw new Error('No shift found');
//     console.log('✅ Fetched shift:', shift);
//     return shift;
//   } catch (error: any) {
//     console.error('❌ Error in getAssignedShifts:', error.response?.data || error.message);
//     return null;
//   }
// }
// function timeToMinutes(time: string): number {
//   const [hours, minutes] = time.split(':').map(Number);
//   return hours * 60 + minutes;
// }
// export async function findClosestShift(shifts: any[], punchTime: string) {
//   try {
//     const punchMinutes = timeToMinutes(punchTime);
//     let closest = null;
//     let minDiff = Infinity;
//     for (const shift of shifts) {
//       const shiftMinutes = timeToMinutes(shift.start);
//       const diff = Math.abs(shiftMinutes - punchMinutes);
//       if (diff < minDiff) {
//         minDiff = diff;
//         closest = {
//           ...shift,
//           breakTime: typeof shift.breakTime === 'string'
//             ? JSON.parse(shift.breakTime)
//             : shift.breakTime,
//         };
//       }
//     }
//     console.log(' Closest shift found:', closest);
//     return closest;
//   } catch (error) {
//     console.error('Error finding closest shift:', error);
//     throw new Error('Failed to determine the closest shift');
//   }
// }
// export async function getAssignedHolidays(empId: string) {
//   try {
//     const response = await axios.get('http://localhost:8056/items/personalModule', {
//       params: {
//         filter: {
//           employeeId: {
//             _eq: empId
//           }
//         },
//         fields: [
//           'id',
//           'assignedUser.id',
//           'assignedHolidays.holiday_id.holidayName',
//           'assignedHolidays.holiday_id.date'
//         ]
//       },
//       headers: {
//         Authorization: `Bearer ${TOKEN}`
//       }
//     });
//     const data = response.data?.data?.[0]?.assignedHolidays || [];
//     return data.map((item: any) => item.holiday_id); // returns array of holiday objects
//   } catch (error) {
//     console.error(' Error fetching holidays:', error);
//     return [];
//   }
// }
// export async function getAttendanceRecord(employeeId: number, time: string, tenantId: string): Promise<any[] | null> {
//   try {
//     console.log("get atten", employeeId, time, tenantId)
//     if (!employeeId || !time || !tenantId) {
//       throw new Error('Missing employeeId, timestamp, or tenantId in payload');
//     }
//     const empQuery = qs.stringify({
//       filter: { employeeId: { _eq: employeeId } },
//       fields: ['id'],
//       limit: 1
//     }, { encodeValuesOnly: true });
//     const headers = {
//       Authorization: `Bearer ${TOKEN}`
//     };
//     const empRes = await axios.get(`${BASE_URL}/items/personalModule?${empQuery}`, { headers });
//     const resolvedEmployeeId = empRes.data?.data?.[0]?.id;
//     console.log("resolved", resolvedEmployeeId)
//     const inputDateObj = new Date(time);
//     const dateString = inputDateObj.toISOString().split('T')[0];
//     const query = qs.stringify({
//       filter: {
//         _and: [
//           { date: { _eq: dateString } },
//           { tenant: { _eq: tenantId } },
//           { employeeId: { id: { _eq: resolvedEmployeeId } } }
//         ]
//       },
//       sort: ['-date_updated'],
//       limit: -1,
//       fields: [
//         'id',
//         'employeeId.id',
//         'employeeId.employeeId',
//         'employeeId.assignedUser.first_name',
//         'employeeId.assignedUser.last_name',
//         'employeeId.assignedDepartment.department_id.departmentName',
//         'employeeId.branch.branchName',
//         'status',
//         'attendance',
//         'inTime',
//         'outTime',
//         'lateBy',
//         'earlyDeparture',
//         'workHours',
//         'onTime',
//         'mode',
//         'date_created',
//         'attendanceContext',
//         'date_updated'
//       ]
//     }, { encodeValuesOnly: true });
//     const fullUrl = `${BASE_URL}/items/attendance?${query}`;
//     console.log('🔍 Checking attendance URL:', fullUrl);
//     const response = await axios.get(fullUrl, {
//       headers: {
//         Authorization: `Bearer ${TOKEN}`
//       }
//     });
//     const records = response.data?.data || [];
//     if (records.length > 0) {
//       console.log('✅ Attendance records found:', records.length);
//       return records;
//     } else {
//       console.log('🟡 No attendance records found');
//       return null;
//     }
//   } catch (error: any) {
//     console.error('❌ Error checking attendance record:', error.response?.data || error.message);
//     return null;
//   }
// }
// export async function insertAttendance(payload: any, existingRecord: any): Promise<any> {
//   try {
//     const { employeeId: employeeCode, date, time, action, mode, tenant } = payload;
//     console.log("from insert", existingRecord, payload);
//     const headers = {
//       Authorization: `Bearer ${TOKEN}`
//     };
//     // Step 1: Resolve employeeId (e.g., 'EMP002' → 3)
//     const empQuery = qs.stringify({
//       filter: { employeeId: { _eq: employeeCode } },
//       fields: ['id'],
//       limit: 1
//     }, { encodeValuesOnly: true });
//     const empRes = await axios.get(`${BASE_URL}/items/personalModule?${empQuery}`, { headers });
//     const resolvedEmployeeId = empRes.data?.data?.[0]?.id;
//     if (!resolvedEmployeeId) {
//       return { message: `❌ Employee not found for code: ${employeeCode}` };
//     }
//     // Step 2: Attendance logic
//     if (existingRecord) {
//       console.log("inside existing")
//       if (action === 'out' || action === 'inout') {
//         console.log("lpg out", existingRecord?.[0]?.id)
//         // const patchUrl = `${BASE_URL}/items/attendance`;
//         let updateData = {
//           outTime: payload.time,
//           mode: payload.mode,
//           status: payload.status
//         }
//         await axios.patch(
//           `http://localhost:8056/items/attendance/${existingRecord?.[0]?.id}`,
//           {
//             outTime: time,
//             punchoutMode: mode
//           },
//           {
//             headers: {
//               Authorization: `Bearer ${TOKEN}`
//             }
//           }
//         );
//         return { message: `✅ ${action === 'out' ? 'Out time' : 'InOut - Out time'} updated in existing record` };
//       }
//       if (action === 'in') {
//         return { message: 'ℹ️ IN already recorded. Skipping insert.' };
//       }
//     } else {
//       // No existing record
//       if (action === 'in' || action === 'out') {
//         await axios.post(`${BASE_URL}/items/attendance`, {
//           employeeId: resolvedEmployeeId,
//           date,
//           tenant,
//           inTime: time,
//           mode,
//           status: 'present',
//           attendance: 'present'
//         }, { headers });
//         return { message: `🆕 New attendance record created with IN (action: ${action})` };
//       }
//       if (action === 'inout') {
//         await axios.post(`${BASE_URL}/items/attendance`, {
//           employeeId: resolvedEmployeeId,
//           date,
//           tenant,
//           inTime: time,
//           outTime: time,
//           punchinMode: mode,
//           punchoutMode: mode,
//           status: 'present',
//           attendance: 'present'
//         }, { headers });
//         return { message: '🆕 New attendance record created with IN/OUT (action: inout)' };
//       }
//     }
//     return { message: '⚠️ Unhandled attendance action' };
//   } catch (error: any) {
//     console.error('❌ Error in insertAttendance:', error.response?.data || error.message);
//     throw new Error('Attendance process failed');
//   }
// }
function calculateEarlyDeparture(scheduledExitTime, actualOutTime) {
    try {
        if (!scheduledExitTime || !actualOutTime)
            return null;
        const [schH, schM, schS] = scheduledExitTime.split(':').map(Number);
        const [actH, actM, actS] = actualOutTime.split(':').map(Number);
        const scheduledDate = new Date(0, 0, 0, schH, schM, schS || 0);
        const actualDate = new Date(0, 0, 0, actH, actM, actS || 0);
        let diffMs = scheduledDate.getTime() - actualDate.getTime();
        if (diffMs <= 0) {
            return "00:00:00"; // No early departure
        }
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    catch (error) {
        console.error("❌ Error calculating early departure:", error);
        return null;
    }
}
async function insertAttendance(payload) {
    try {
        console.log("payload payload", payload);
        // Step 1: Check if record with uniqueId already exists
        const checkUrl = `${BASE_URL}/items/attendance?filter[uniqueId][_eq]=${payload.uniqueId}`;
        const checkResponse = await axios_1.default.get(checkUrl, {
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
            },
        });
        const existing = checkResponse.data?.data?.[0];
        if (existing) {
            // Step 2: Update if exists
            const workHours = await calculateWorkHours(existing.inTime, payload.outTime);
            const earlyDeparture = await calculateEarlyDeparture("18:00", payload.outTime);
            console.log("early", earlyDeparture);
            console.log("wwwww", workHours);
            payload.workHours = workHours;
            payload.earlyDeparture = earlyDeparture;
            const updateUrl = `${BASE_URL}/items/attendance/${existing.id}`;
            const updateResponse = await axios_1.default.patch(updateUrl, payload, {
                headers: {
                    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                },
            });
            console.log('📝 Attendance record updated:', updateResponse.data);
            return updateResponse.data;
        }
        else {
            // Step 3: Insert if not found
            const insertResponse = await axios_1.default.post(`${BASE_URL}/items/attendance`, payload, {
                headers: {
                    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                },
            });
            console.log('✅ Attendance record inserted:', insertResponse.data);
            return insertResponse.data;
        }
    }
    catch (error) {
        console.error('❌ Error in insertAttendance:', error.response?.data || error.message);
        throw new Error('Attendance process failed');
    }
}
