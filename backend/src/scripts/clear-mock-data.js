import { connectDb, disconnectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Donation } from '../models/Donation.js';
import { Reservation } from '../models/Reservation.js';
import { PickupTask } from '../models/PickupTask.js';
import { DemandRequest } from '../models/DemandRequest.js';
import { Incident } from '../models/Incident.js';
import { Notification } from '../models/Notification.js';
import { PredictionLog } from '../models/PredictionLog.js';
import { AuditLog } from '../models/AuditLog.js';

async function clearMockData() {
  await connectDb();

  try {
    console.log('Clearing all mock operational data from MongoDB while keeping users and organizations...');

    const [dRes, rRes, pRes, drRes, iRes, nRes, plRes, aRes] = await Promise.all([
      Donation.deleteMany({}),
      Reservation.deleteMany({}),
      PickupTask.deleteMany({}),
      DemandRequest.deleteMany({}),
      Incident.deleteMany({}),
      Notification.deleteMany({}),
      PredictionLog.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    // Reset impact metrics on organizations
    await Organization.updateMany({}, {
      impactMetrics: {
        totalDonations: 0,
        totalPortions: 0,
        totalKg: 0,
        mealsDistributed: 0,
        co2SavedKg: 0,
      },
    });

    const userCount = await User.countDocuments();
    const orgCount = await Organization.countDocuments();

    console.log('\n============================= CLEAR SUMMARY =============================');
    console.log(`Donations removed:       ${dRes.deletedCount}`);
    console.log(`Reservations removed:    ${rRes.deletedCount}`);
    console.log(`Pickup tasks removed:    ${pRes.deletedCount}`);
    console.log(`Demand requests removed: ${drRes.deletedCount}`);
    console.log(`Incidents removed:       ${iRes.deletedCount}`);
    console.log(`Notifications removed:   ${nRes.deletedCount}`);
    console.log(`Prediction logs removed: ${plRes.deletedCount}`);
    console.log(`Audit logs removed:      ${aRes.deletedCount}`);
    console.log('Organization impact metrics reset to 0.');
    console.log(`\nExisting users KEPT:     ${userCount}`);
    console.log(`Organizations KEPT:       ${orgCount}`);
    console.log('=========================================================================\n');
  } finally {
    await disconnectDb();
  }
}

clearMockData().catch((err) => {
  console.error('Failed to clear mock data:', err);
  process.exit(1);
});
