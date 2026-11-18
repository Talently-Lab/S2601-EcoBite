-- Revert the case-insensitive email unique index.
DROP INDEX IF EXISTS "public"."users_email_lower_unique_idx";
