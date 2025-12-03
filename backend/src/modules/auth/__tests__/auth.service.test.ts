import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { verifyEmailOtp, resendVerificationOtp } from "../auth.service";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  emailVerification: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
}));

vi.mock("../../../db/client", () => ({
  prisma: mockPrisma,
}));

const sendVerificationEmailMock = vi.hoisted(() => vi.fn());
vi.mock("../../../utils/email", () => ({
  sendVerificationEmail: sendVerificationEmailMock,
}));

const futureDate = () => new Date(Date.now() + 5 * 60 * 1000);

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findUnique.mockReset();
  mockPrisma.user.update.mockReset();
  mockPrisma.emailVerification.findUnique.mockReset();
  mockPrisma.emailVerification.upsert.mockReset();
  mockPrisma.emailVerification.update.mockReset();
  mockPrisma.emailVerification.delete.mockReset();
  mockPrisma.emailVerification.deleteMany.mockReset();
  sendVerificationEmailMock.mockReset();
  mockPrisma.emailVerification.deleteMany.mockResolvedValue(undefined);
  mockPrisma.emailVerification.delete.mockResolvedValue(undefined);
  mockPrisma.emailVerification.upsert.mockResolvedValue(undefined);
  mockPrisma.$transaction.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
});

describe("verifyEmailOtp", () => {
  it("verifies a valid OTP and clears verification data", async () => {
    const otp = "123456";
    const codeHash = await bcrypt.hash(otp, 10);

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      emailVerified: false,
    });

    mockPrisma.emailVerification.findUnique.mockResolvedValueOnce({
      userId: "user-1",
      purpose: "verify_email",
      codeHash,
      expiresAt: futureDate(),
    });

    mockPrisma.user.update.mockResolvedValueOnce({});
    mockPrisma.emailVerification.delete.mockResolvedValueOnce({});

    const result = await verifyEmailOtp({ email: "user@example.com", otp });

    expect(result.message).toMatch(/Email address verified/);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ emailVerified: true }),
    });
    expect(mockPrisma.emailVerification.delete).toHaveBeenCalled();
  });

  it("increments attempts on invalid OTP", async () => {
    const otp = "123456";
    const codeHash = await bcrypt.hash("654321", 10);

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      emailVerified: false,
    });

    mockPrisma.emailVerification.findUnique.mockResolvedValueOnce({
      userId: "user-1",
      purpose: "verify_email",
      codeHash,
      attempts: 0,
      expiresAt: futureDate(),
    });

    mockPrisma.emailVerification.update.mockResolvedValueOnce({ attempts: 1 });

    await expect(verifyEmailOtp({ email: "user@example.com", otp })).rejects.toThrow(/Invalid verification code/);
    expect(mockPrisma.emailVerification.update).toHaveBeenCalled();
  });

  it("throws after maximum attempts are exceeded", async () => {
    const otp = "123456";
    const codeHash = await bcrypt.hash("654321", 10);

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      emailVerified: false,
    });

    mockPrisma.emailVerification.findUnique
      .mockResolvedValueOnce({
        userId: "user-1",
        purpose: "verify_email",
        codeHash,
        attempts: 4,
        expiresAt: futureDate(),
      });

    mockPrisma.emailVerification.update.mockResolvedValueOnce({ attempts: 5 });
    mockPrisma.emailVerification.delete.mockResolvedValueOnce({});

    await expect(verifyEmailOtp({ email: "user@example.com", otp })).rejects.toThrow(/Maximum attempts reached/);
    expect(mockPrisma.emailVerification.delete).toHaveBeenCalled();
  });
});

describe("resendVerificationOtp", () => {
  it("throws when resend limit is exceeded", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "user@example.com",
      emailVerified: false,
      verificationToken: "token",
      verificationTokenExpiresAt: futureDate(),
      name: "User",
    });

    mockPrisma.emailVerification.findUnique.mockResolvedValueOnce({
      userId: "user-1",
      purpose: "verify_email",
      resendCount: 3,
      createdAt: new Date(),
    });

    await expect(resendVerificationOtp({ email: "user@example.com" })).rejects.toThrow(
      /Too many verification requests/
    );
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });
});

