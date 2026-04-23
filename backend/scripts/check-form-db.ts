import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('DB_TIMEOUT_5000ms')), 5000);
  });

  const count = (await Promise.race([
    prisma.form.count(),
    timeout,
  ])) as number;

  console.log('FORM_COUNT', count);

  const t0 = Date.now();
  const form = await Promise.race([
    prisma.form.findFirst({
      where: { slug: 'this-is-form-title', status: 'published' },
      select: { id: true, slug: true, status: true },
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('FORM_LOOKUP_TIMEOUT_5000ms')), 5000);
    }),
  ]);

  console.log('FORM_LOOKUP_MS', Date.now() - t0);
  console.log('FORM_LOOKUP_RESULT', form);

  if (form && typeof form === 'object' && 'id' in form) {
    const formId = (form as { id: string }).id;
    const responseCount = await Promise.race([
      prisma.formResponse.count({ where: { formId } }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('FORM_RESPONSE_COUNT_TIMEOUT_5000ms')), 5000);
      }),
    ]);
    console.log('FORM_RESPONSE_COUNT', responseCount);
  }
}

main()
  .catch((err) => {
    console.error('ERR', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
