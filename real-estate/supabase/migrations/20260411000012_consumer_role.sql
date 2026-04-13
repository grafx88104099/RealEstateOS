-- Migration part 1: Add 'consumer' enum value
-- Must commit before using the new value (PostgreSQL constraint)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'consumer';
