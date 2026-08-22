-- CreateTable
CREATE TABLE "MenuIcon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuIcon_pkey" PRIMARY KEY ("id")
);
