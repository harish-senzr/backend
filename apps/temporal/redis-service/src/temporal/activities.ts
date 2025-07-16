// import Redis from 'ioredis';

// const redis = new Redis(); // default: localhost:6379
// const BASE_URL = 'http://localhost:8056';
// const COLLECTION = 'personalModule';

// export async function getPersonalModuleData(id: number | string) {
//   console.log("inside the getdata");

//   const url = `${BASE_URL}/items/${COLLECTION}/${id}?fields=employeeId,assignedUser.id,assignedUser.first_name,assignedUser.email,assignedUser.tenant.tenantName,assignedUser.tenant.tenantId,assignedTag.id,assignedFaceEmbed`;
//   console.log(url);

//   const DIRECTUS_TOKEN = 'AzCVH0EuknN7bXL33CRgXPFexljTjY9w'; // Store in .env

//   try {
//     const response = await fetch(url, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Error ${response.status}: ${response.statusText}`);
//     }

//     const data = await response.json();
//     console.log('Personal Module Data:', data);
//     return data;
//   } catch (err) {
//     console.error('Failed to fetch personal module data:', err);
//     throw err;
//   }
// }



// export async function updateRedis(payload: any): Promise<void> {
//   console.log('Updating Redis...', payload);

//   const data = payload.data;

//   if (!data?.employeeId || !data?.assignedUser?.tenant?.tenantId) {
//     console.error('❌ Missing tenantId or employeeId in payload');
//     return;
//   }

//   const tenantId = data.assignedUser.tenant.tenantId;
//   const employeeId = data.employeeId;

//   const redisKey = `employee:${tenantId}`;
//   const redisField = employeeId;
//   const redisValue = JSON.stringify(data);

//   try {
//     await redis.hset(redisKey, redisField, redisValue);
//     console.log(`✅ Redis updated → Key: ${redisKey}, Field: ${redisField}`);
//   } catch (error) {
//     console.error(`❌ Redis update failed → Key: ${redisKey}, Field: ${redisField}`, error);
//   }
// }



import { Client } from 'minio';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';


import Redis from 'ioredis';

const redis = new Redis(); 
// const BASE_URL = 'http://localhost:8056';
const COLLECTION = 'personalModule';
const BASE_URL = process.env.BASE_URL || 'http://localhost:8056'; // fallback optional
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
export async function getPersonalModuleData(id: number | string) {
  console.log("Fetching personal module data...");

  const url = `${BASE_URL}/items/${COLLECTION}/${id}?fields=employeeId,assignedUser.id,assignedUser.first_name,assignedUser.email,assignedUser.tenant.tenantName,assignedUser.tenant.tenantId,assignedTag.id,assignedFaceEmbed`;

  console.log("Request URL:", url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 403) {
      console.warn(`403 Forbidden for ID ${id}, deleting from Redis...`);
      await deleteEmployeeById(id); // Try delete fallback
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const attendance =await getLatestAttendanceRecord(id) 
    console.log('Fetched Personal Module Data:', data,attendance);
    return {data,attendance};
  } catch (err) {
    console.error('Failed to fetch personal module data:', err);
    throw err;
  }
}



export async function getLatestAttendanceRecord(employeeId: string | number) {
  const url = `${BASE_URL}/items/attendance?filter[_and][0][employeeId][id][_eq]=${employeeId}&limit=1000`;

  console.log("Fetching latest attendance for employee:", employeeId);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const result: any = await response.json();
    const allRecords = result?.data || [];

    if (!allRecords.length) {
      console.log(" No attendance records found");
      return null;
    }

    allRecords.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const latestRecord = allRecords[0];
    console.log('Latest Attendance Record:', latestRecord);
    const latest={
      status:latestRecord.status,
      inTime:latestRecord.inTime,
      outTime:latestRecord.outTime,
      attendance:latestRecord.attendance,
      date:latestRecord.date

    }

    return latest;
  } catch (err) {
    console.error(' Failed to fetch latest attendance:', err);
    throw err;
  }
}




export async function updateRedis(payload: any): Promise<void> {
  console.log('Updating Redis...', payload);

  const data = payload.data.data;

  if (!data?.employeeId || !data?.assignedUser?.tenant?.tenantId) {
    console.error('Missing tenantId or employeeId in payload');
    return;
  }

  const tenantId = data.assignedUser.tenant.tenantId;
  const employeeId = data.employeeId;
  const finalData= {data,attendance:payload.attendance}
  console.log(finalData)

  const redisKey = `employee:${tenantId}`;
  const redisField = employeeId;
  const redisValue = JSON.stringify(finalData);
  console.log(redisValue)

  try {
    // Store the actual employee data in hash
    await redis.hset(redisKey, redisField, redisValue);

    // Create reverse index for easy deletion later
    await redis.set(`employeeIndex:${employeeId}`, tenantId);

    console.log(`Redis updated → Key: ${redisKey}, Field: ${redisField}`);
    console.log(`Reverse index saved → employeeIndex:${employeeId} = ${tenantId}`);
  } catch (error) {
    console.error(`Redis update failed → Key: ${redisKey}, Field: ${redisField}`, error);
  }
}

export async function deleteEmployeeById(employeeId: number | string) {
  try {
    console.log("hello 1")
    const tenantId = await redis.get(`employeeIndex:${employeeId}`);
    console.log("hello 2")

    if (!tenantId) {
      console.warn(`No reverse index found for employeeId: ${employeeId}`);
      return;
    }
    console.log("hello 3")


    const redisKey = `employee:${tenantId}`;
    console.log("hello 4")

    const redisField = employeeId.toString();

    console.log("hello 5")

    // Delete from hash and reverse index

    await redis.hdel(redisKey, redisField);
    console.log("hello 6")

    await redis.del(`employeeIndex:${employeeId}`);
    console.log("hello 7")

    console.log(`Deleted employee:${employeeId} from tenant:${tenantId}`);
  } catch (error) {
    console.error(`Failed to delete employeeId ${employeeId} from Redis`, error);
  }
}



type CardManagementRecord = {
  rfidCard: string;
  employeeId: { employeeId: string } | null;
};

/**
 * Format date as YYYY-MM-DD
 */
function getDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ⚙️ Configure your MinIO client
const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'YOUR_MINIO_ACCESS_KEY',
  secretKey: 'YOUR_MINIO_SECRET_KEY',
});

/**
 * Uploads flattened card data to MinIO as <tenantId>-YYYY-MM-DD.json
 */
export async function uploadCardDataToMinio(
  data: CardManagementRecord[],
  bucket: string,
  tenantId: string
): Promise<{ key: string; url: string; expiresAt: string }> {
  const flattened = data.map((item) => ({
    rfidCard: item.rfidCard,
    employeeId: item.employeeId?.employeeId || null,
  }));

  const dateStr = getDateString(); // e.g., 2025-07-15
  const filename = `${tenantId}-${dateStr}.json`;
  const objectKey = `${tenantId}/card-data/${filename}`;
  const filePath = path.join('/tmp', filename);

  writeFileSync(filePath, JSON.stringify(flattened, null, 2));

  const metaData = {
    'Content-Type': 'application/json',
  };

  try {
    await minioClient.fPutObject(bucket, objectKey, filePath, metaData);
    console.log(`✅ Uploaded to MinIO at: ${objectKey}`);

    // Optional: Generate presigned URL valid for 1 hour
    const expiresIn = 3600;
    const url = await minioClient.presignedGetObject(bucket, objectKey, expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return { key: objectKey, url, expiresAt };
  } catch (err) {
    console.error('❌ Upload failed:', err);
    throw err;
  } finally {
    unlinkSync(filePath); // clean up temp file
  }
}