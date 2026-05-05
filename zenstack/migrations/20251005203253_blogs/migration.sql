/*
  Warnings:

  - A unique constraint covering the columns `[walletAddress]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "authMethod" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN     "lastWalletSignIn" TIMESTAMP(3),
ADD COLUMN     "walletAddress" TEXT,
ADD COLUMN     "walletNonce" TEXT,
ADD COLUMN     "walletNonceExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."blog_post_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallet_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "chainId" INTEGER,
    "networkName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallet_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletType" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDate" TIMESTAMP(3),
    "firstConnectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastConnectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectionCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallet_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "networkName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT,
    "tokenAddress" TEXT,
    "tokenSymbol" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "blockNumber" INTEGER,
    "gasUsed" TEXT,
    "gasPrice" TEXT,
    "orderId" TEXT,
    "productId" TEXT,
    "investmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_likes_userId_postId_key" ON "public"."blog_post_likes"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_sessions_sessionId_key" ON "public"."wallet_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "wallet_sessions_userId_idx" ON "public"."wallet_sessions"("userId");

-- CreateIndex
CREATE INDEX "wallet_sessions_walletAddress_idx" ON "public"."wallet_sessions"("walletAddress");

-- CreateIndex
CREATE INDEX "wallet_sessions_sessionId_idx" ON "public"."wallet_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "wallet_sessions_expiresAt_idx" ON "public"."wallet_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "wallet_sessions_isActive_idx" ON "public"."wallet_sessions"("isActive");

-- CreateIndex
CREATE INDEX "wallet_connections_userId_idx" ON "public"."wallet_connections"("userId");

-- CreateIndex
CREATE INDEX "wallet_connections_walletAddress_idx" ON "public"."wallet_connections"("walletAddress");

-- CreateIndex
CREATE INDEX "wallet_connections_isPrimary_idx" ON "public"."wallet_connections"("isPrimary");

-- CreateIndex
CREATE INDEX "wallet_connections_isVerified_idx" ON "public"."wallet_connections"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_connections_userId_walletAddress_key" ON "public"."wallet_connections"("userId", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_transactionHash_key" ON "public"."wallet_transactions"("transactionHash");

-- CreateIndex
CREATE INDEX "wallet_transactions_userId_idx" ON "public"."wallet_transactions"("userId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletAddress_idx" ON "public"."wallet_transactions"("walletAddress");

-- CreateIndex
CREATE INDEX "wallet_transactions_transactionHash_idx" ON "public"."wallet_transactions"("transactionHash");

-- CreateIndex
CREATE INDEX "wallet_transactions_chainId_idx" ON "public"."wallet_transactions"("chainId");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "public"."wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "public"."wallet_transactions"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_createdAt_idx" ON "public"."wallet_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "public"."users"("walletAddress");

-- AddForeignKey
ALTER TABLE "public"."blog_post_likes" ADD CONSTRAINT "blog_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_post_likes" ADD CONSTRAINT "blog_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallet_sessions" ADD CONSTRAINT "wallet_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallet_connections" ADD CONSTRAINT "wallet_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
