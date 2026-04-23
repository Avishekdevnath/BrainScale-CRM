import { prisma } from '../src/db/client';

async function createTestForm() {
  try {
    const form = await prisma.form.create({
      data: {
        id: 'test-form-' + Date.now(),
        workspaceId: 'test-workspace-' + Date.now(),
        ownerUserId: 'test-user',
        title: 'Load Test Form',
        description: 'Form for load testing',
        type: 'general',
        status: 'published',
        slug: 'load-test-form',
        fields: {
          moduleRating: { type: 'text' },
          wouldRecommend: { type: 'text' },
          feedback: { type: 'text' }
        } as any,
        settings: {} as any,
      },
    });
    
    console.log('✅ Form created:', form.id);
    console.log('📝 Slug:', form.slug);
    console.log('🔗 Test URL: http://localhost:5000/api/v1/forms/load-test-form/submit');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestForm();
