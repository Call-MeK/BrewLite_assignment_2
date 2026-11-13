-- ZaloPay Sandbox is the only payment source created by the application.
-- The MOCK enum value stays so historical rows remain readable.
ALTER TABLE "payments" ALTER COLUMN "source" SET DEFAULT 'ZALOPAY_SANDBOX';
