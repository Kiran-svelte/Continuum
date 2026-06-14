/**
 * Recruitment Pipeline Engine for Continuum HR.
 *
 * Handles candidate advancement through interview stages,
 * offer letter generation, and domain event emission.
 *
 * @module lib/recruitment/pipeline-engine
 */

import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type { ApplicationStatus, OfferStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvanceResult {
  applicationId: string;
  previousStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  previousStage: number;
  newStage: number;
}

export interface OfferTerms {
  designation: string;
  department?: string;
  ctcOffered: number;
  joiningDate: string;
  createdBy: string;
}

export interface PipelineStageResult {
  stageName: string;
  candidateCount: number;
  conversionRate: number | null;
}

// ─── Main Functions ───────────────────────────────────────────────────────────

/**
 * Advances a candidate to the next interview stage.
 * If no more stages remain, moves to 'offered' status.
 *
 * @param applicationId - The job application to advance.
 * @param companyId     - Company scope for validation.
 * @returns AdvanceResult showing stage transition.
 * @throws Error if application not found or already in terminal status.
 */
export async function advanceCandidate(
  applicationId: string,
  companyId: string
): Promise<AdvanceResult> {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, company_id: companyId },
    include: {
      JobPosting: { include: { stages: { orderBy: { stage_order: 'asc' } } } },
    },
  });

  if (!application) {
    throw new Error(`Application ${applicationId} not found`);
  }

  if (['hired', 'rejected', 'withdrawn'].includes(application.status)) {
    throw new Error(`Cannot advance application in terminal status: ${application.status}`);
  }

  const stages = application.JobPosting.stages;
  const nextStageOrder = application.current_stage + 1;
  const hasMoreStages = stages.some((s) => s.stage_order === nextStageOrder);

  const newStage = hasMoreStages ? nextStageOrder : application.current_stage;
  const newStatus: ApplicationStatus = hasMoreStages ? 'interviewing' : 'offered';

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { current_stage: newStage, status: newStatus },
  });

  return {
    applicationId,
    previousStatus: application.status,
    newStatus,
    previousStage: application.current_stage,
    newStage,
  };
}

/**
 * Rejects a candidate from the pipeline.
 *
 * @param applicationId  - The application to reject.
 * @param companyId      - Company scope.
 * @param rejectionReason - Optional reason for the rejection.
 */
export async function rejectCandidate(
  applicationId: string,
  companyId: string,
  rejectionReason?: string
): Promise<void> {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, company_id: companyId },
  });

  if (!application) {
    throw new Error(`Application ${applicationId} not found`);
  }

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status: 'rejected', rejection_reason: rejectionReason ?? null },
  });
}

/**
 * Creates a draft offer letter for a candidate.
 * Application must be in 'offered' status.
 *
 * @param applicationId - The application to generate offer for.
 * @param companyId     - Company scope.
 * @param terms         - Offer terms including CTC, designation, and joining date.
 * @returns Created OfferLetter record.
 */
export async function generateOfferLetter(
  applicationId: string,
  companyId: string,
  terms: OfferTerms
) {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, company_id: companyId },
  });

  if (!application) {
    throw new Error(`Application ${applicationId} not found`);
  }

  if (application.status !== 'offered') {
    throw new Error(`Offer can only be generated when application status is 'offered'. Current: ${application.status}`);
  }

  const offer = await prisma.offerLetter.create({
    data: {
      id: randomUUID(),
      application_id: applicationId,
      company_id: companyId,
      designation: terms.designation,
      department: terms.department ?? null,
      ctc_offered: terms.ctcOffered,
      joining_date: new Date(terms.joiningDate),
      status: 'draft',
      created_by: terms.createdBy,
    },
  });

  return offer;
}

/**
 * Marks an offer as sent and updates the offer letter status.
 *
 * @param offerId   - The offer letter to send.
 * @param companyId - Company scope.
 */
export async function sendOffer(offerId: string, companyId: string): Promise<void> {
  const offer = await prisma.offerLetter.findFirst({
    where: { id: offerId, company_id: companyId },
  });

  if (!offer) throw new Error(`Offer ${offerId} not found`);
  if (offer.status !== 'draft' && offer.status !== 'pending_approval') {
    throw new Error(`Cannot send offer in status: ${offer.status}`);
  }

  await prisma.offerLetter.update({
    where: { id: offerId },
    data: { status: 'sent', sent_at: new Date() },
  });
}

/**
 * Records candidate acceptance of an offer and marks them as hired.
 *
 * @param offerId         - The offer letter being accepted.
 * @param applicationId   - The related job application.
 * @param companyId       - Company scope.
 */
export async function acceptOffer(
  offerId: string,
  applicationId: string,
  companyId: string
): Promise<void> {
  await prisma.$transaction([
    prisma.offerLetter.update({
      where: { id: offerId },
      data: { status: 'accepted', accepted_at: new Date() },
    }),
    prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: 'hired', hired_at: new Date() },
    }),
  ]);
}

/**
 * Computes pipeline stage conversion rates for a job posting.
 *
 * @param jobId     - The job posting to analyze.
 * @param companyId - Company scope.
 * @returns Array of stage results with candidate counts and conversion rates.
 */
export async function getPipelineStats(
  jobId: string,
  companyId: string
): Promise<PipelineStageResult[]> {
  const stages = await prisma.interviewStage.findMany({
    where: { job_id: jobId, company_id: companyId },
    orderBy: { stage_order: 'asc' },
  });

  const applications = await prisma.jobApplication.findMany({
    where: { job_id: jobId, company_id: companyId },
    select: { current_stage: true, status: true },
  });

  const total = applications.length;
  const results: PipelineStageResult[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const reachedStage = applications.filter((a) => a.current_stage >= stage.stage_order).length;
    const prevReached = i === 0 ? total : applications.filter((a) => a.current_stage >= stages[i - 1].stage_order).length;

    results.push({
      stageName: stage.name,
      candidateCount: reachedStage,
      conversionRate: prevReached > 0 ? Math.round((reachedStage / prevReached) * 100) / 100 : null,
    });
  }

  return results;
}
