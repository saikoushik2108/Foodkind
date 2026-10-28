import { connectDb, disconnectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';

const [, , action, email, value] = process.argv;

async function run() {
  await connectDb();

  try {
    if (!action || action === 'list') {
      const users = await User.find().populate('organization', 'name type verificationStatus').sort({ createdAt: 1 });
      console.log('\n============================= ALL USERS IN DATABASE =============================\n');
      console.table(
        users.map((u) => ({
          ID: u._id.toString(),
          Name: u.name,
          Email: u.email,
          Role: u.role,
          Membership: u.membershipRole,
          OrgType: u.organization?.type || 'None (Admin)',
          OrgName: u.organization?.name || 'N/A',
          Status: u.status,
        }))
      );
      console.log('Total users:', users.length);
      console.log('\nAvailable commands:');
      console.log('  node src/scripts/manage-user.js list');
      console.log('  node src/scripts/manage-user.js password <email> <newPassword>');
      console.log('  node src/scripts/manage-user.js role <email> <ADMIN|MEMBER>');
      console.log('  node src/scripts/manage-user.js membership <email> <OWNER|MANAGER|STAFF|VOLUNTEER>');
      console.log('  node src/scripts/manage-user.js status <email> <ACTIVE|SUSPENDED|BANNED>\n');
      return;
    }

    if (!email) {
      console.error('Error: Please provide a user email.');
      process.exit(1);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('organization');
    if (!user) {
      console.error(`Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    if (action === 'password') {
      if (!value || value.length < 8) {
        console.error('Error: Password must be at least 8 characters long.');
        process.exit(1);
      }
      user.password = value;
      await user.save();
      console.log(`✅ Password successfully changed for "${user.email}".`);
      return;
    }

    if (action === 'role') {
      const upper = value?.toUpperCase();
      if (!['ADMIN', 'MEMBER'].includes(upper)) {
        console.error('Error: Role must be either ADMIN or MEMBER.');
        process.exit(1);
      }
      user.role = upper;
      await user.save();
      console.log(`✅ Role successfully updated to "${upper}" for "${user.email}".`);
      return;
    }

    if (action === 'membership') {
      const upper = value?.toUpperCase();
      if (!['OWNER', 'MANAGER', 'STAFF', 'VOLUNTEER'].includes(upper)) {
        console.error('Error: Membership role must be OWNER, MANAGER, STAFF, or VOLUNTEER.');
        process.exit(1);
      }
      user.membershipRole = upper;
      await user.save();
      console.log(`✅ Membership role successfully updated to "${upper}" for "${user.email}".`);
      return;
    }

    if (action === 'status') {
      const upper = value?.toUpperCase();
      if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(upper)) {
        console.error('Error: Status must be ACTIVE, SUSPENDED, or BANNED.');
        process.exit(1);
      }
      user.status = upper;
      await user.save();
      console.log(`✅ Status successfully updated to "${upper}" for "${user.email}".`);
      return;
    }

    console.error(`Unknown action: "${action}". Valid actions are: list, password, role, membership, status.`);
  } finally {
    await disconnectDb();
  }
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
