-- CreateTable
CREATE TABLE "grp" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" UUID NOT NULL,
    "profile_emoji" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "interest_active" BOOLEAN NOT NULL DEFAULT false,
    "apr_bps" INTEGER NOT NULL DEFAULT 0,
    "grace_days" INTEGER NOT NULL DEFAULT 0,
    "start_after_days" INTEGER NOT NULL DEFAULT 0,
    "compounding" TEXT NOT NULL DEFAULT 'none',
    "cap_pct" INTEGER,

    CONSTRAINT "grp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_member" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upi_vpa" TEXT,

    CONSTRAINT "group_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "payer_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "spent_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_split" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expense_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "share_minor" BIGINT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'equal',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "payer_id" UUID NOT NULL,
    "payee_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "client_txn_ref" TEXT NOT NULL,
    "upi_txn_id" TEXT,
    "approval_ref_no" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_grp_admin" ON "grp"("admin_id");

-- CreateIndex
CREATE INDEX "idx_group_member_user" ON "group_member"("user_id");

-- CreateIndex
CREATE INDEX "idx_group_member_group" ON "group_member"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_group_member" ON "group_member"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_expense_group_spent" ON "expense"("group_id", "spent_at");

-- CreateIndex
CREATE INDEX "idx_expense_payer" ON "expense"("payer_id");

-- CreateIndex
CREATE INDEX "idx_expense_split_expense" ON "expense_split"("expense_id");

-- CreateIndex
CREATE INDEX "idx_expense_split_member" ON "expense_split"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_client_txn_ref_key" ON "settlement"("client_txn_ref");

-- CreateIndex
CREATE INDEX "idx_settlement_group_created" ON "settlement"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_settlement_payer" ON "settlement"("payer_id");

-- CreateIndex
CREATE INDEX "idx_settlement_payee" ON "settlement"("payee_id");

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grp" ADD CONSTRAINT "grp_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "grp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "grp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_split" ADD CONSTRAINT "expense_split_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_split" ADD CONSTRAINT "expense_split_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "group_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "grp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
