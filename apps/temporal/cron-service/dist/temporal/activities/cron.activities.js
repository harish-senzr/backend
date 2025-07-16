"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTenants = getAllTenants;
exports.getUsersByTenant = getUsersByTenant;
exports.getAttendanceForPreviousDay = getAttendanceForPreviousDay;
exports.markUsersAbsent = markUsersAbsent;
const axios_1 = __importDefault(require("axios"));
// const BASE_URL = 'http://localhost:8056';
// const TOKEN = 'AzCVH0EuknN7bXL33CRgXPFexljTjY9w';
const BASE_URL = process.env.BASE_URL || 'http://localhost:8056'; // fallback optional
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
const axiosInstance = axios_1.default.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    },
});
async function getAllTenants() {
    try {
        const res = await axiosInstance.get('/items/tenant');
        console.log(res.data.data.map((tenant) => tenant.tenantId));
        return res.data.data.map((tenant) => tenant.tenantId);
    }
    catch (error) {
        console.error('Error fetching tenants:', error);
        return [];
    }
}
async function getUsersByTenant(tenantId) {
    try {
        const res = await axiosInstance.get(`/items/personalModule?filter[_and][0][assignedUser][tenant][tenantId][_eq]=${tenantId}`);
        console.log(res.data);
        return res.data.data.map((user) => user.id);
    }
    catch (error) {
        console.error(`Error fetching users for tenant ${tenantId}:`, error);
        return [];
    }
}
async function getAttendanceForPreviousDay(tenantId) {
    try {
        const today = new Date();
        today.setDate(today.getDate() - 1);
        const date = today.toISOString().split('T')[0];
        console.log(date, tenantId);
        const res = await axiosInstance.get(`/items/attendance?filter[_and][0][tenant][tenantId][_eq]=${tenantId}&filter[_and][1][date][_eq]=${date}`);
        console.log(res.data.data.map((user) => user.employeeId));
        return res.data.data.map((user) => user.employeeId);
    }
    catch (error) {
        console.error(`Error fetching attendance for tenant ${tenantId}:`, error);
        return [];
    }
}
async function markUsersAbsent(tenantId, absentees) {
    if (!tenantId) {
        console.error('Tenant ID is undefined');
        return;
    }
    try {
        const today = new Date();
        today.setDate(today.getDate() - 1);
        const date = today.toISOString().split('T')[0];
        await Promise.all(absentees.map(user => {
            if (!user?.id) {
                console.warn('Skipping user without ID:', user);
                return Promise.resolve();
            }
            const data = {
                tenant: tenantId,
                employeeId: user.id,
                attendance: 'absent',
                date,
                mode: 'cronJob',
            };
            return axiosInstance.post('/items/attendance', data);
        }));
        console.log(`Marked ${absentees.length} users absent for tenant ${tenantId}`);
    }
    catch (error) {
        console.error(`Error marking absentees for tenant ${tenantId}:`, error);
    }
}
