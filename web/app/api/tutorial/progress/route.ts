import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthEmployee } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';

/**
 * GET /api/tutorial/progress
 * Get tutorial progress for the current user
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const employee = await getAuthEmployee(request);
  if (!employee) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get tutorial progress from TutorialProgress table
    const progress = await prisma.tutorialProgress.findMany({
      where: { employee_id: employee.id },
      select: {
        tutorial_id: true,
        current_step: true,
        completed: true,
        completed_at: true,
        started_at: true,
      },
    });

    // Also get the employee's tutorial_completed flag
    const employeeData = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { tutorial_completed: true },
    });

    return NextResponse.json({
      tutorials: progress,
      allCompleted: employeeData?.tutorial_completed ?? false,
    });
  } catch (error) {
    console.error('Error fetching tutorial progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

/**
 * POST /api/tutorial/progress
 * Update tutorial progress
 */
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const employee = await getAuthEmployee(request);
  if (!employee) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tutorialId, currentStep, completed } = body;

    if (!tutorialId) {
      return NextResponse.json({ error: 'Tutorial ID required' }, { status: 400 });
    }

    // Upsert progress record
    const progress = await prisma.tutorialProgress.upsert({
      where: {
        employee_id_tutorial_id: {
          employee_id: employee.id,
          tutorial_id: tutorialId,
        },
      },
      create: {
        employee_id: employee.id,
        tutorial_id: tutorialId,
        current_step: currentStep ?? 0,
        completed: completed ?? false,
        started_at: new Date(),
        completed_at: completed ? new Date() : null,
      },
      update: {
        current_step: currentStep ?? undefined,
        completed: completed ?? undefined,
        completed_at: completed ? new Date() : undefined,
      },
    });

    // If tutorial is completed, check if all tutorials are done
    if (completed) {
      // For now, mark the main tutorial as complete
      // In a more complete system, you'd check all required tutorials
      await prisma.employee.update({
        where: { id: employee.id },
        data: { tutorial_completed: true },
      });
    }

    return NextResponse.json({
      message: 'Progress updated',
      progress: {
        tutorialId: progress.tutorial_id,
        currentStep: progress.current_step,
        completed: progress.completed,
      },
    });
  } catch (error) {
    console.error('Error updating tutorial progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

/**
 * DELETE /api/tutorial/progress
 * Reset tutorial progress (for debugging/testing)
 */
export async function DELETE(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const employee = await getAuthEmployee(request);
  if (!employee) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tutorialId = searchParams.get('tutorialId');

    if (tutorialId) {
      // Delete specific tutorial progress
      await prisma.tutorialProgress.deleteMany({
        where: {
          employee_id: employee.id,
          tutorial_id: tutorialId,
        },
      });
    } else {
      // Delete all tutorial progress
      await prisma.tutorialProgress.deleteMany({
        where: { employee_id: employee.id },
      });

      // Reset the flag
      await prisma.employee.update({
        where: { id: employee.id },
        data: { tutorial_completed: false },
      });
    }

    return NextResponse.json({ message: 'Progress reset' });
  } catch (error) {
    console.error('Error resetting tutorial progress:', error);
    return NextResponse.json({ error: 'Failed to reset progress' }, { status: 500 });
  }
}
