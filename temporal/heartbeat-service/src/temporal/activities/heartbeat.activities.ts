// activities/heartbeat.activities.ts
import axios from 'axios';

// const BASE_URL = 'http://localhost:8056';
// const TOKEN = "AzCVH0EuknN7bXL33CRgXPFexljTjY9w"
const BASE_URL = process.env.BASE_URL || 'http://localhost:8056'; // fallback optional
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
export async function verifyDevice(sn: string): Promise<boolean> {
  const URL = `${BASE_URL}?filter[uniqueId][_eq]=${sn}&fields=id,deviceName,deviceType,status,model,deviceIp,serverIPUrl,uniqueId,installedLocation,image,date_created,user_created,date_updated,user_updated`;
  console.log("Verifying device using URL:", URL);

  try {
    const response = await axios.get(URL, {
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`
      }
    });

    const device = response.data?.data?.[0];

    if (device) {
      console.log("Device found:", device);
      return true;
    } else {
      console.log(" No device found for SN:", sn);
      return false;
    }

  } catch (error) {
    console.error("Failed to verify device:", error);
    return false;
  }
}



export async function storeHeartbeat(payload: any): Promise<void> {
  try {
    const timestamp = payload.timestamp;

    const date = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
    const time = `${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}`;

    console.log("Date:", date);
    console.log("Time:", time);
    const timestamp1 = payload.timestamp;

    const formattedDateTime = `${timestamp1.slice(0, 4)}-${timestamp1.slice(4, 6)}-${timestamp1.slice(6, 8)}T${timestamp1.slice(8, 10)}:${timestamp1.slice(10, 12)}:${timestamp1.slice(12, 14)}Z`;

    payload.timestamp = formattedDateTime;

    // payload.date = date;
    // payload.time = time;

    console.log("Payload to store heartbeat:", payload);

    await axios.post(`${BASE_URL}/items/device_heartBeat`, payload, {
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`
      }
    });

    console.log("Heartbeat stored successfully.");
  } catch (error) {
    console.error("Failed to store heartbeat:", error);
  }
}

