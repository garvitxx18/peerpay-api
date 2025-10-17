-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_e164" TEXT,
    "display_name" TEXT,
    "upi_vpa" TEXT,
    "upi_verified" BOOLEAN NOT NULL DEFAULT false,
    "base_currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_otp" (
    "id" BIGSERIAL NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_phone_e164_key" ON "app_user"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_upi_vpa_key" ON "app_user"("upi_vpa");

-- CreateIndex
CREATE INDEX "idx_phone_otp_exp" ON "phone_otp"("expires_at");

-- CreateIndex
CREATE INDEX "idx_phone_otp_phone" ON "phone_otp"("phone_e164");

-- CreateIndex
CREATE INDEX "idx_user_session_user" ON "user_session"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_session_exp" ON "user_session"("expires_at");

