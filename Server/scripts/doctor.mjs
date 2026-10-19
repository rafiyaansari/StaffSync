#!/usr/bin/env node
/**
 * StaffSync database doctor.
 *
 * Answers the question "why does my seeded login return 401?" by inspecting the
 * database the API actually connects to — read-only unless you ask for a repair.
 *
 *   npm run db:doctor                         # checks only, exits 1 if anything is wrong
 *   npm run db:doctor -- --fix-demo-passwords # resets the 3 demo passwords in place
 *
 * Nothing is ever deleted. The repair flag only touches the three documented
 * demo accounts (and creates them if the employee exists but the account does
 * not). Real accounts are never modified.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import Employee from '../src/models/Employee.js';
import User from '../src/models/User.js';

const flags = new Set(process.argv.slice(2));
const FIX = flags.has('--fix-demo-passwords');

const DEMO_ACCOUNTS = [
  { email: 'priya.sharma@nimbuslabs.com', label: 'HR' },
  { email: 'rohan.kapoor@nimbuslabs.com', label: 'Manager' },
  { email: 'aarav.mehta@nimbuslabs.com', label: 'Employee' },
];

/** Host + database only — never the credentials. */
function safeTarget(uri) {
  try {
    const withoutCreds = uri.replace(/\/\/([^@/]+)@/, '//***@');
    const match = withoutCreds.match(/^mongodb(\+srv)?:\/\/([^/?]+)\/([^?]*)/);
    if (!match) return 'unknown (could not parse MONGO_URI)';
    return `${match[2]} / database "${match[3] || '(default)'}"`;
  } catch {
    return 'unknown';
  }
}

const line = (ok, text) => `${ok ? '  ✅' : '  ❌'} ${text}`;
const warn = (text) => `  ⚠️  ${text}`;

async function main() {
  console.log('\nStaffSync database doctor');
  console.log('─'.repeat(58));
  console.log(`Environment : ${env.nodeEnv}`);
  console.log(`Target      : ${safeTarget(env.mongoUri)}`);
  console.log(`Demo pass   : ${'*'.repeat(Math.min(env.seedDemoPassword.length, 12))} (SEED_DEMO_PASSWORD)`);

  await connectDatabase();
  const dbName = mongoose.connection.name;

  const [employees, users, leaves, attendance, announcements, trainings, notifications, registrations] =
    await Promise.all([
      Employee.countDocuments({}),
      User.countDocuments({}),
      mongoose.connection.collection('leaverequests').countDocuments(),
      mongoose.connection.collection('attendances').countDocuments(),
      mongoose.connection.collection('announcements').countDocuments(),
      mongoose.connection.collection('trainingprograms').countDocuments(),
      mongoose.connection.collection('notifications').countDocuments(),
      mongoose.connection.collection('registrationrequests').countDocuments(),
    ]);

  console.log('\nCollections');
  console.log(
    `  employees ${employees} · accounts ${users} · leaves ${leaves} · attendance ${attendance} · ` +
      `announcements ${announcements} · training ${trainings} · notifications ${notifications} · registrations ${registrations}`,
  );

  if (employees === 0) {
    console.log(warn('The database is empty. Run:  npm run seed'));
  }

  let failures = 0;
  console.log('\nDemo accounts');

  for (const demo of DEMO_ACCOUNTS) {
    const employee = await Employee.findOne({ email: demo.email });
    const user = await User.findOne({ email: demo.email }).select('+passwordHash');

    if (!employee) {
      console.log(line(false, `${demo.label.padEnd(8)} ${demo.email} — no employee record in this database`));
      failures += 1;
      continue;
    }

    if (!user) {
      console.log(line(false, `${demo.label.padEnd(8)} ${demo.email} — employee exists (${employee.employeeCode}) but has NO login account`));
      if (FIX) {
        const created = await User.create({
          email: demo.email,
          passwordHash: await bcrypt.hash(env.seedDemoPassword, env.bcryptRounds),
          role: employee.systemRole,
          status: 'active',
          employee: employee._id,
        });
        console.log(line(Boolean(created), `${demo.label.padEnd(8)} created a login account for ${demo.email}`));
      } else {
        failures += 1;
      }
      continue;
    }

    const passwordMatches = user.passwordHash
      ? await bcrypt.compare(env.seedDemoPassword, user.passwordHash)
      : false;
    const linked = user.employee
      ? await Employee.exists({ _id: user.employee })
      : null;
    const linkOk = Boolean(linked);
    const statusOk = user.status === 'active';
    const roleOk = !employee.systemRole || user.role === employee.systemRole;

    const details = [
      passwordMatches ? 'password OK' : 'password MISMATCH',
      statusOk ? 'status active' : `status "${user.status}"`,
      linkOk ? 'linked profile' : 'NOT linked to a profile',
      roleOk ? `role ${user.role}` : `role ${user.role} ≠ employee ${employee.systemRole}`,
    ].join(' · ');

    const healthy = passwordMatches && statusOk && linkOk && roleOk;
    console.log(line(healthy, `${demo.label.padEnd(8)} ${demo.email} — ${details}`));
    if (healthy) continue;

    if (FIX) {
      user.passwordHash = await bcrypt.hash(env.seedDemoPassword, env.bcryptRounds);
      user.status = 'active';
      user.role = employee.systemRole || user.role;
      if (!linkOk) user.employee = employee._id;
      await user.save({ validateBeforeSave: false });
      console.log(line(true, `${demo.label.padEnd(8)} repaired ${demo.email} (password reset, status activated, profile linked)`));
    } else {
      failures += 1;
    }
  }

  // Orphans are the second most common cause of "login works but the app breaks".
  const orphanUsers = await User.countDocuments({
    employee: null,
    status: { $in: ['active'] },
  });
  const employeesWithoutAccounts = await Employee.countDocuments({
    status: 'Active',
    email: { $nin: await User.distinct('email') },
  });

  console.log('\nConsistency');
  console.log(
    orphanUsers
      ? line(false, `${orphanUsers} active account(s) with no employee link — sign-in returns 403`)
      : line(true, 'every active account is linked to an employee'),
  );
  console.log(
    employeesWithoutAccounts
      ? warn(`${employeesWithoutAccounts} active employee(s) have no login account (fine if intentional)`)
      : line(true, 'every active employee has a login account'),
  );

  if (orphanUsers) failures += 1;

  console.log('\n' + '─'.repeat(58));
  if (employees === 0) {
    console.log('The database is empty, so there is nothing to sign in with yet.');
    console.log('Populate it (safe: it refuses to touch a non-empty database):');
    console.log('  npm run seed\n');
    process.exitCode = 1;
  } else if (failures > 0 && !FIX) {
    console.log(`${failures} problem(s) found.`);
    console.log('Safe repair (only the 3 demo accounts, nothing deleted):');
    console.log('  npm run db:doctor -- --fix-demo-passwords\n');
    process.exitCode = 1;
  } else if (FIX) {
    console.log('Repair complete. Try signing in again with the demo password.\n');
  } else {
    console.log(`Database looks healthy (${dbName}). You can sign in with the demo accounts.\n`);
  }
}

main()
  .catch((error) => {
    console.error('\n[db:doctor] Failed:', error.message);
    if (/MongoServerSelectionError|ENOTFOUND|timed out/i.test(error.message)) {
      console.error('The database could not be reached. Check MONGO_URI, your Atlas IP allowlist and your network/DNS.');
      console.error('If Atlas SRV lookups fail on Windows, try:  npm run db:doctor:dns');
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
    await mongoose.connection.close().catch(() => {});
  });
