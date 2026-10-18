import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Donation } from '../models/Donation.js';
import { Reservation } from '../models/Reservation.js';
import { PickupTask } from '../models/PickupTask.js';
import { DemandRequest } from '../models/DemandRequest.js';
import { PredictionLog } from '../models/PredictionLog.js';
import { Notification } from '../models/Notification.js';
import { Incident } from '../models/Incident.js';
import { AuditLog } from '../models/AuditLog.js';

const isClearOnly = process.argv.includes('--clear');

async function seed() {
  try {
    await connectDb();
    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'Connected to MongoDB for seeding' }));

    // Clear existing data
    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'Clearing database collections...' }));
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Donation.deleteMany({}),
      Reservation.deleteMany({}),
      PickupTask.deleteMany({}),
      DemandRequest.deleteMany({}),
      PredictionLog.deleteMany({}),
      Notification.deleteMany({}),
      Incident.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'Clear complete' }));

    if (isClearOnly) {
      console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'Database successfully cleared. Exiting.' }));
      await disconnectDb();
      process.exit(0);
    }

    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'Creating seed organizations...' }));

    // 1. Organizations
    const donorOrg = await Organization.create({
      name: 'Grand Horizon Hotel & Banquets',
      type: 'DONOR',
      description: 'Luxury hotel and convention center hosting daily dining and corporate events.',
      address: {
        line: '42 MG Road, Central District',
        city: 'Bengaluru',
        region: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716], // [lng, lat]
      },
      serviceAreaKm: 15,
      verificationStatus: 'APPROVED',
      verificationNote: 'Verified FSSAI license & verified premises.',
      contactEmail: 'banquets@grandhorizon.local',
      contactPhone: '+91 98765 43210',
      canStoreChilled: true,
      maxStoragePortions: 500,
      impactMetrics: {
        totalDonations: 18,
        totalPortions: 1250,
        totalKg: 450,
        mealsDistributed: 1250,
        co2SavedKg: 2375,
      },
      isSeed: true,
    });

    const recipientOrg = await Organization.create({
      name: 'Hope Community Food Bank & Shelter',
      type: 'RECIPIENT',
      description: 'Community kitchen and shelter serving nourishing meals to over 300 individuals daily.',
      address: {
        line: '15 Indiranagar 100ft Road',
        city: 'Bengaluru',
        region: 'Karnataka',
        postalCode: '560038',
        country: 'India',
      },
      location: {
        type: 'Point',
        coordinates: [77.6412, 12.9784],
      },
      serviceAreaKm: 12,
      dailyPeopleServed: 320,
      maxStoragePortions: 400,
      canStoreChilled: true,
      verificationStatus: 'APPROVED',
      verificationNote: 'Non-profit registration verified.',
      contactEmail: 'intake@hopeshelter.local',
      contactPhone: '+91 98111 22334',
      impactMetrics: {
        totalDonations: 14,
        totalPortions: 980,
        mealsDistributed: 980,
        co2SavedKg: 1862,
      },
      isSeed: true,
    });

    const partnerOrg = await Organization.create({
      name: 'FoodKind City Volunteer Fleet',
      type: 'PARTNER',
      description: 'Trained volunteer rescue squad providing temperature-controlled food transport.',
      address: {
        line: '8 Koramangala 4th Block',
        city: 'Bengaluru',
        region: 'Karnataka',
        postalCode: '560034',
        country: 'India',
      },
      location: {
        type: 'Point',
        coordinates: [77.6271, 12.9352],
      },
      serviceAreaKm: 25,
      verificationStatus: 'APPROVED',
      contactEmail: 'dispatch@foodkindfleet.local',
      contactPhone: '+91 98450 99887',
      isSeed: true,
    });

    const pendingOrg = await Organization.create({
      name: 'Spice Garden Bistro & Catering',
      type: 'DONOR',
      description: 'High-volume restaurant and catering company specializing in North & South Indian cuisine.',
      address: {
        line: '104 Whitefield Main Road',
        city: 'Bengaluru',
        region: 'Karnataka',
        postalCode: '560066',
        country: 'India',
      },
      location: {
        type: 'Point',
        coordinates: [77.7500, 12.9698],
      },
      verificationStatus: 'PENDING',
      verificationNote: 'Awaiting inspection certificate review.',
      contactEmail: 'contact@spicegarden.local',
      isSeed: true,
    });

    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'Creating seed users...' }));

    // 2. Users (Admin, Donor, Recipient, Volunteer)
    const adminUser = await User.create({
      name: 'Admin Supervisor',
      email: 'admin@foodkind.local',
      password: 'DevAdmin!123',
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: null,
      acceptedPolicies: true,
      isSeed: true,
    });

    // Also support admin@demo.replate.local alias
    await User.create({
      name: 'Admin Supervisor (Demo)',
      email: 'admin@demo.replate.local',
      password: 'DevAdmin!123',
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: null,
      acceptedPolicies: true,
      isSeed: true,
    });

    const donorUser = await User.create({
      name: 'Chef Rajesh Sharma',
      email: 'donor@demo.replate.local',
      password: 'DevUser!123',
      role: 'MEMBER',
      status: 'ACTIVE',
      organization: donorOrg._id,
      membershipRole: 'OWNER',
      phone: '+91 98765 43210',
      acceptedPolicies: true,
      isSeed: true,
    });

    await User.create({
      name: 'Chef Rajesh Sharma',
      email: 'donor@foodkind.local',
      password: 'DevUser!123',
      role: 'MEMBER',
      status: 'ACTIVE',
      organization: donorOrg._id,
      membershipRole: 'OWNER',
      phone: '+91 98765 43210',
      acceptedPolicies: true,
      isSeed: true,
    });

    const recipientUser = await User.create({
      name: 'Sister Mary Joseph',
      email: 'hope@demo.replate.local',
      password: 'DevUser!123',
      role: 'MEMBER',
      status: 'ACTIVE',
      organization: recipientOrg._id,
      membershipRole: 'OWNER',
      phone: '+91 98111 22334',
      acceptedPolicies: true,
      isSeed: true,
    });

    await User.create({
      name: 'Sister Mary Joseph',
      email: 'hope@foodkind.local',
      password: 'DevUser!123',
      role: 'MEMBER',
      status: 'ACTIVE',
      organization: recipientOrg._id,
      membershipRole: 'OWNER',
      phone: '+91 98111 22334',
      acceptedPolicies: true,
      isSeed: true,
    });

    const volunteerUser = await User.create({
      name: 'Arun Kumar',
      email: 'volunteer@demo.replate.local',
      password: 'DevUser!123',
      role: 'MEMBER',
      status: 'ACTIVE',
      organization: partnerOrg._id,
      membershipRole: 'VOLUNTEER',
      phone: '+91 98450 99887',
      acceptedPolicies: true,
      isSeed: true,
    });

    await User.create({
      name: 'Arun Kumar',
      email: 'volunteer@foodkind.local',
      password: 'DevUser!123',
      role: 'MEMBER',
      status: 'ACTIVE',
      organization: partnerOrg._id,
      membershipRole: 'VOLUNTEER',
      phone: '+91 98450 99887',
      acceptedPolicies: true,
      isSeed: true,
    });

    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'Creating seed donations...' }));

    // 3. Donations
    const now = new Date();
    const expiryAvailable = new Date(now.getTime() + 6 * 60 * 60 * 1000); // in 6 hours
    const expiryDelivered = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday

    const availableDonation = await Donation.create({
      donor: donorOrg._id,
      createdBy: donorUser._id,
      title: 'Buffet Lunch Surplus: Biryani & Paneer Butter Masala',
      description: 'Freshly prepared from today corporate banquet buffet. Stored in hot holding units at 65°C.',
      category: 'PREPARED_MEAL',
      dietaryClassification: 'VEG',
      allergens: ['Dairy'],
      quantity: 60,
      remainingQuantity: 60,
      unit: 'PORTIONS',
      packagingType: 'SEALED_PACKAGING',
      storageRequirement: 'HOT_HOLDING',
      pickupArrangement: 'BOTH',
      mealPeriod: 'LUNCH',
      preparedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      bestBefore: expiryAvailable,
      pickupWindowStart: now,
      pickupWindowEnd: expiryAvailable,
      pickupAddress: donorOrg.address.line + ', ' + donorOrg.address.city,
      pickupLocation: donorOrg.location,
      status: 'AVAILABLE',
      impactEstimate: {
        mealsEquivalent: 60,
        co2SavedKg: 114,
        wastePreventedKg: 27,
      },
      isSeed: true,
    });

    const completedDonation = await Donation.create({
      donor: donorOrg._id,
      createdBy: donorUser._id,
      title: 'Assorted Gourmet Bread & Dinner Rolls',
      description: 'Morning bake surplus, packaged into hygienic food-grade paper boxes.',
      category: 'BAKED_GOODS',
      dietaryClassification: 'VEGAN',
      allergens: ['Gluten'],
      quantity: 45,
      remainingQuantity: 0,
      actualQuantity: 45,
      unit: 'PORTIONS',
      packagingType: 'DISPOSABLE_BOXES',
      storageRequirement: 'AMBIENT',
      pickupArrangement: 'PARTNER_PICKUP',
      mealPeriod: 'BREAKFAST',
      preparedAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
      bestBefore: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      pickupAddress: donorOrg.address.line + ', ' + donorOrg.address.city,
      pickupLocation: donorOrg.location,
      status: 'COMPLETED',
      impactEstimate: {
        mealsEquivalent: 45,
        co2SavedKg: 85.5,
        wastePreventedKg: 20.25,
      },
      isSeed: true,
    });

    // 4. Reservations & Pickups
    const completedRes = await Reservation.create({
      donation: completedDonation._id,
      recipient: recipientOrg._id,
      reservedBy: recipientUser._id,
      quantity: 45,
      status: 'COMPLETED',
      isSeed: true,
    });

    await PickupTask.create({
      reservation: completedRes._id,
      donation: completedDonation._id,
      donor: donorOrg._id,
      recipient: recipientOrg._id,
      assignedTo: volunteerUser._id,
      assignmentType: 'VOLUNTEER',
      status: 'COMPLETED',
      quantity: 45,
      scheduledAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      collectedAt: new Date(now.getTime() - 19 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      handoverCode: '4829',
      notes: 'Handover complete without issues.',
      isSeed: true,
    });

    // 5. Demand Request
    await DemandRequest.create({
      organization: recipientOrg._id,
      createdBy: recipientUser._id,
      title: 'Urgent Dinner Service: Need Prepared Vegetarian Meals',
      description: 'Daily evening meal support for approximately 80 shelter residents.',
      category: 'PREPARED_MEAL',
      dietaryClassification: 'VEG',
      quantityNeeded: 80,
      unit: 'PORTIONS',
      neededBy: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      mealPeriod: 'DINNER',
      status: 'OPEN',
      notes: 'Evening dinner service for shelter residents.',
      isSeed: true,
    });

    // 6. Notifications
    await Notification.create([
      {
        user: recipientUser._id,
        organization: recipientOrg._id,
        type: 'DONATION_MATCH',
        title: 'New surplus available near you!',
        message: 'Grand Horizon Hotel posted 60 portions of Buffet Lunch Surplus.',
        link: `/marketplace/${availableDonation._id}`,
        read: false,
        isSeed: true,
      },
      {
        user: donorUser._id,
        organization: donorOrg._id,
        type: 'PICKUP_COMPLETED',
        title: 'Delivery confirmed!',
        message: '45 portions of Gourmet Bread were successfully delivered to Hope Community Food Bank.',
        link: `/donations/${completedDonation._id}`,
        read: true,
        isSeed: true,
      },
    ]);

    // 7. Audit Log
    await AuditLog.create({
      actor: adminUser._id,
      action: 'SYSTEM_INITIALIZED',
      resource: 'System',
      details: { environment: 'development', mode: 'seed' },
      isSeed: true,
    });

    console.log(JSON.stringify({
      time: new Date().toISOString(),
      level: 'info',
      message: 'Seed complete — FoodKind Demo Data Loaded',
      accounts: {
        admin: 'admin@demo.replate.local / DevAdmin!123',
        donor: 'donor@demo.replate.local / DevUser!123',
        recipient: 'hope@demo.replate.local / DevUser!123',
        volunteer: 'volunteer@demo.replate.local / DevUser!123',
      },
    }));

    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      level: 'error',
      message: 'Seed failed',
      error: err.message,
      stack: err.stack,
    }));
    await disconnectDb();
    process.exit(1);
  }
}

seed();
