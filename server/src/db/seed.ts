// Creates the first user from ADMIN_EMAIL / ADMIN_PASSWORD if no user with that email exists yet.
// Safe to run on every deploy. Run with `bun run db:seed`.
import { auth } from '../auth/auth.ts'
import { prisma } from './prisma.ts'

/**
 * Creates a user with an email/password account, unless one with that email already exists.
 * Public sign-up is disabled (auth.api.signUpEmail refuses), so this goes through Better Auth's
 * internal adapter, the same way the sign-up endpoint does.
 */
export async function createUserIfMissing({ email, password, name }: { email: string; password: string; name: string }) {
  const ctx = await auth.$context
  const normalizedEmail = email.toLowerCase()

  const existing = await ctx.internalAdapter.findUserByEmail(normalizedEmail, { includeAccounts: true })
  const user =
    existing?.user ??
    (await ctx.internalAdapter.createUser({ email: normalizedEmail, name, emailVerified: false }, { method: 'admin' }))

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
  return { created: !existing, user }
}

if (import.meta.main) {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set.')

  const { created } = await createUserIfMissing({ email, password, name: 'Admin' })
  console.log(created ? `Created user ${email}` : `User ${email} already exists, nothing to do`)
  await prisma.$disconnect()
}
