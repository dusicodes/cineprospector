-- Drop the unique index on profiles.email.
--
-- `email` is a denormalized cache of the Supabase Auth user's email; Supabase
-- Auth owns email uniqueness. The unique constraint here breaks legitimate
-- flows: re-sign-up with a new auth.users.id (e.g. after account deletion),
-- email change in Supabase Auth, and orphaned profile rows. Removing it lets
-- `ensureProfile` upsert by `id` reliably.
DROP INDEX IF EXISTS "profiles_email_key";