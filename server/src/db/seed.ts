// Makes sure the admin from ADMIN_EMAIL / ADMIN_PASSWORD exists and has the admin role.
// Safe to run on every deploy. Run with `bun run db:seed`.
import { auth, type Session } from '../auth/auth.ts'
import { Role } from '../generated/prisma/enums.ts'
import { prisma } from './prisma.ts'

/**
 * Makes sure a user with this email exists, has an email/password account and has the given role.
 * Never changes an existing password. Public sign-up is disabled (auth.api.signUpEmail refuses), so this
 * goes through Better Auth's internal adapter, the same way the sign-up endpoint does.
 */
export async function ensureUser({
  email,
  password,
  name,
  role,
}: {
  email: string
  password: string
  name: string
  role: Role
}) {
  const ctx = await auth.$context
  // Hashing directly (below) skips the length rules Better Auth applies on sign-up and password change.
  const { minPasswordLength, maxPasswordLength } = ctx.password.config
  if (password.length < minPasswordLength || password.length > maxPasswordLength) {
    throw new Error(`Password must be ${minPasswordLength}-${maxPasswordLength} characters.`)
  }
  const normalizedEmail = email.toLowerCase()

  const existing = await ctx.internalAdapter.findUserByEmail(normalizedEmail, { includeAccounts: true })
  // The internal adapter is typed with the base user fields only; the row also has our additional fields.
  let user = (existing?.user ??
    (await ctx.internalAdapter.createUser(
      { email: normalizedEmail, name, emailVerified: false, role },
      { method: 'admin' },
    ))) as Session['user']

  // Also covers a previous run that created the user but failed before linking the password.
  const hasPassword = existing?.accounts.some((account) => account.providerId === 'credential') ?? false
  if (!hasPassword) {
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: await ctx.password.hash(password),
    })
  }

  const roleChanged = user.role !== role
  if (roleChanged) {
    user = (await ctx.internalAdapter.updateUser(user.id, { role })) as Session['user']
  }

  return { created: !existing, roleChanged: !!existing && roleChanged, user }
}

if (import.meta.main) {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set.')
  if (process.env.NODE_ENV === 'production' && password === 'password123') {
    throw new Error('ADMIN_PASSWORD is the development default from .env.example; set a strong password.')
  }

  const { created, roleChanged } = await ensureUser({ email, password, name: 'Admin', role: Role.admin })
  console.log(
    created
      ? `Created admin ${email}`
      : roleChanged
        ? `Made existing user ${email} an admin`
        : `Admin ${email} already exists, nothing to do`,
  )
  await prisma.$disconnect()
}
