"use strict";
// // worker.ts
// import { Worker } from '@temporalio/worker';
// import * as heartbeatActivities from './activities/heartbeat.activities';
// import * as deviceActivities from './activities/device.activities';
// import { listenToNats } from './subscriber';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// async function run() {
//    await listenToNats();
//   const worker = await Worker.create({
//     // Point to a directory or list of workflow files
//     workflowsPath: require.resolve('./workflow/index.ts'),
//     activities: {
//       ...heartbeatActivities,
//       ...deviceActivities,
//     },
//     taskQueue: 'main-queue', 
//   });
//   console.log('👷 Worker listening on main-queue for heartbeat and attendance workflows...');
//   await worker.run();
// }
// run();
const worker_1 = require("@temporalio/worker");
const deviceActivities = __importStar(require("./activities/device.activities"));
const subscriber_1 = require("./subscriber");
async function run() {
    await (0, subscriber_1.listenToNats)();
    const worker = await worker_1.Worker.create({
        workflowsPath: require.resolve('./workflow/device.workflow.ts'),
        activities: deviceActivities,
        taskQueue: 'device-queue',
    });
    await worker.run();
}
run();
