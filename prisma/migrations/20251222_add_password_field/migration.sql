-- AddPasswordField
-- Add password column to User table for email/password authentication
-- Password is nullable to support OAuth-only users

-- Add password column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'password'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "password" TEXT;
  END IF;
END $$;
