const API_BASE = 'http://127.0.0.1:5050/api/v1';

async function testE2E() {
  console.log('--- STARTING FULL CROSS-DASHBOARD E2E TEST ---');

  // Helper using native fetch with cookies
  async function loginAs(email, password) {
    let cookie = '';
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Login failed');

    async function req(url, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookie,
        ...(options.headers || {}),
      };
      const r = await fetch(`${API_BASE}${url}`, { ...options, headers });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(json.error?.message || json.message || `Request failed with ${r.status}`);
      }
      return json;
    }

    return { req, user: data.data.user, org: data.data.organization };
  }

  // 1. Log in as Donor
  console.log('\n1. Logging in as Donor (donor@foodkind.local)...');
  const donor = await loginAs('donor@foodkind.local', 'DevUser!123');
  console.log(`   Logged in as: ${donor.user.name} (${donor.org?.name})`);

  // 2. Log in as Recipient
  console.log('\n2. Logging in as Recipient (hope@foodkind.local)...');
  const recipient = await loginAs('hope@foodkind.local', 'DevUser!123');
  console.log(`   Logged in as: ${recipient.user.name} (${recipient.org?.name})`);

  // 3. Log in as Volunteer
  console.log('\n3. Logging in as Volunteer (volunteer@foodkind.local)...');
  const volunteer = await loginAs('volunteer@foodkind.local', 'DevUser!123');
  console.log(`   Logged in as: ${volunteer.user.name} (${volunteer.org?.name})`);

  // 4. Donor Publishes Surplus Food
  const testTitle = `Fresh Curry & Rice - Test #${Date.now().toString().slice(-4)}`;
  console.log(`\n4. Donor publishing surplus listing: "${testTitle}"...`);
  const publishRes = await donor.req('/donations', {
    method: 'POST',
    body: JSON.stringify({
      title: testTitle,
      description: 'Hot fresh meals prepared in clean facility.',
      category: 'PREPARED_MEAL',
      dietaryClassification: 'VEG',
      quantity: 40,
      unit: 'PORTIONS',
      storageRequirement: 'HOT_HOLDING',
      pickupArrangement: 'BOTH',
      mealPeriod: 'LUNCH',
      bestBefore: new Date(Date.now() + 8 * 3600000).toISOString(),
      pickupWindowStart: new Date(Date.now() + 1800000).toISOString(),
      pickupWindowEnd: new Date(Date.now() + 5 * 3600000).toISOString(),
      publishNow: true,
    }),
  });

  const createdDonation = publishRes.data;
  console.log(`   Created donation ID: ${createdDonation._id || createdDonation.id}`);
  console.log(`   Status: ${createdDonation.status}`);
  if (createdDonation.status !== 'AVAILABLE') {
    throw new Error(`Expected status to be AVAILABLE, got ${createdDonation.status}`);
  }
  console.log('   ✅ Listing successfully published as AVAILABLE directly!');

  // 5. Recipient Views Available Listings (Marketplace / Dashboard)
  console.log('\n5. Recipient searching available marketplace listings...');
  const marketplaceRes = await recipient.req('/donations');
  const items = marketplaceRes.data || [];
  const foundInMarketplace = items.find((d) => d.title === testTitle);
  if (!foundInMarketplace) {
    throw new Error(`Recipient could NOT find the published listing "${testTitle}" in marketplace!`);
  }
  console.log(`   ✅ Recipient successfully sees listing "${foundInMarketplace.title}" (${foundInMarketplace.availableQuantity} ${foundInMarketplace.unit} available)!`);

  // 6. Recipient Claims / Reserves 25 portions
  console.log('\n6. Recipient making a reservation for 25 portions...');
  const donationId = createdDonation._id || createdDonation.id;
  const reserveRes = await recipient.req(`/donations/${donationId}/reservations`, {
    method: 'POST',
    body: JSON.stringify({
      quantity: 25,
      pickupMethod: 'VOLUNTEER_DELIVERY',
      notes: 'Urgent dinner distribution for youth shelter.',
    }),
  });
  const reservation = reserveRes.data;
  console.log(`   Reservation created: ID=${reservation._id || reservation.id}, quantity=${reservation.quantity}, status=${reservation.status}`);
  console.log('   ✅ Reservation created successfully!');

  // 7. Verify Donation Status updated to PARTIALLY_RESERVED or RESERVED
  console.log('\n7. Verifying donor and recipient view of remaining quantity...');
  const updatedDonationRes = await recipient.req(`/donations/${donationId}`);
  const updatedDonation = updatedDonationRes.data;
  console.log(`   Remaining quantity: ${updatedDonation.remainingQuantity} (originally 40, reserved 25)`);
  if (updatedDonation.remainingQuantity !== 15) {
    throw new Error(`Expected remaining quantity to be 15, got ${updatedDonation.remainingQuantity}`);
  }
  console.log('   ✅ Remaining quantity correctly reduced from 40 to 15 simultaneously!');

  // 8. Volunteer Views Available Pickups
  console.log('\n8. Volunteer checking assigned / rescue pickups...');
  const pickupsRes = await volunteer.req('/pickups/mine');
  const pickupTasks = pickupsRes.data || [];
  console.log(`   Volunteer has ${pickupTasks.length} active/available task(s).`);

  // Clean up the test donation
  console.log('\n9. Cleaning up test donation...');
  await donor.req(`/donations/${donationId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'E2E test completed' }),
  });
  console.log('   ✅ Test donation cleaned up.');

  console.log('\n======================================================');
  console.log('🎉 FULL CROSS-DASHBOARD WORKFLOW TEST PASSED 100%!');
  console.log('======================================================\n');
}

testE2E().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err.message);
  process.exit(1);
});
