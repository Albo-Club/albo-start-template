import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useNavigate } from '@tanstack/react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Input } from '~/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Textarea } from '~/components/ui/textarea';
import { useToast } from '~/components/ui/toast';
import {
  AdminSecurityPolicyDetail,
  PolicySourceCollapsible,
} from '~/features/security/components/AdminSecurityPolicyDetail';
import { AdminSecurityReportDetail } from '~/features/security/components/AdminSecurityReportDetail';
import { DetailLoadingState } from '~/features/security/components/routes/AdminSecurityRouteShared';
import {
  getSecurityPath,
  useSecurityNavigation,
} from '~/features/security/components/routes/securityRouteUtils';
import {
  AdminSecurityReviewsTab,
  type AutoCollectedEvidenceLink,
} from '~/features/security/components/tabs/AdminSecurityReviewsTab';
import {
  formatReviewRunStatus,
  getReviewRunStatusBadgeVariant,
  getReviewTaskBadgeVariant,
  getReviewTaskStatusLabel,
  mergeReviewRunSummaryWithDetail,
} from '~/features/security/formatters';
import type { SecurityReviewsSearch } from '~/features/security/search';
import { finalizeReviewRunServerFn } from '~/features/security/server/security-reviews';
import type {
  AuditReadinessOverview,
  EvidenceReportDetail,
  ReviewRunDetail,
  ReviewRunSummary,
  ReviewTaskDetail,
  SecurityPolicyDetail,
} from '~/features/security/types';

export function AdminSecurityReviewsRoute(props: { search: SecurityReviewsSearch }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { navigateToControl } = useSecurityNavigation();
  const auditReadiness = useQuery(api.securityPosture.getAuditReadinessOverview, {}) as
    | AuditReadinessOverview
    | undefined;
  const refreshReviewRunAutomation = useAction(api.securityReviews.refreshReviewRunAutomation);
  const ensureCurrentAnnualReviewRun = useMutation(
    api.securityReviews.ensureCurrentAnnualReviewRun,
  );
  const createTriggeredReviewRun = useMutation(api.securityReviews.createTriggeredReviewRun);
  const attestReviewTask = useMutation(api.securityReviews.attestReviewTask);
  const setReviewTaskException = useMutation(api.securityReviews.setReviewTaskException);
  const openTriggeredFollowUp = useMutation(api.securityReviews.openTriggeredFollowUp);
  const currentAnnualReviewRunQuery = useQuery(
    api.securityReviews.getCurrentAnnualReviewRun,
    {},
  ) as ReviewRunSummary | null | undefined;
  const triggeredReviewRuns = useQuery(api.securityReviews.listTriggeredReviewRuns, {}) as
    | ReviewRunSummary[]
    | undefined;
  const [localAnnualReviewRun, setLocalAnnualReviewRun] = useState<ReviewRunSummary | null>(null);
  const [localAnnualReviewDetail, setLocalAnnualReviewDetail] = useState<ReviewRunDetail | null>(
    null,
  );
  const [localTriggeredReviewRuns, setLocalTriggeredReviewRuns] = useState<ReviewRunSummary[]>([]);
  const [localSelectedReviewRunDetail, setLocalSelectedReviewRunDetail] =
    useState<ReviewRunDetail | null>(null);
  const currentAnnualReviewRun = currentAnnualReviewRunQuery ?? localAnnualReviewRun;
  const resolvedTriggeredReviewRuns = localTriggeredReviewRuns;
  const currentAnnualReviewDetailQuery = useQuery(
    api.securityReviews.getReviewRunDetail,
    currentAnnualReviewRun?.id
      ? { reviewRunId: currentAnnualReviewRun.id as Id<'reviewRuns'> }
      : 'skip',
  ) as ReviewRunDetail | null | undefined;
  const currentAnnualReviewDetail = currentAnnualReviewDetailQuery ?? localAnnualReviewDetail;
  const selectedReviewRunDetailQuery = useQuery(
    api.securityReviews.getReviewRunDetail,
    props.search.selectedReviewRun
      ? { reviewRunId: props.search.selectedReviewRun as Id<'reviewRuns'> }
      : 'skip',
  ) as ReviewRunDetail | null | undefined;
  const selectedReviewRunDetail = localSelectedReviewRunDetail ?? selectedReviewRunDetailQuery;
  const selectedReviewRunSummary = useMemo(() => {
    if (!props.search.selectedReviewRun) {
      return null;
    }
    if (currentAnnualReviewRun?.id === props.search.selectedReviewRun) {
      return currentAnnualReviewRun;
    }
    return (
      resolvedTriggeredReviewRuns.find((run) => run.id === props.search.selectedReviewRun) ?? null
    );
  }, [currentAnnualReviewRun, props.search.selectedReviewRun, resolvedTriggeredReviewRuns]);
  const [busyReviewRunAction, setBusyReviewRunAction] = useState<string | null>(null);
  const [busyReviewTaskAction, setBusyReviewTaskAction] = useState<string | null>(null);
  const [isPreparingAnnualReview, setIsPreparingAnnualReview] = useState(false);
  const [isTriggeredReviewDialogOpen, setIsTriggeredReviewDialogOpen] = useState(false);
  const [reviewTaskNotes, setReviewTaskNotes] = useState<Record<string, string>>({});
  const [reviewTaskDocuments, setReviewTaskDocuments] = useState<
    Record<string, { label: string; url: string; version: string }>
  >({});
  const [newTriggeredReviewTitle, setNewTriggeredReviewTitle] = useState('');
  const [newTriggeredReviewType, setNewTriggeredReviewType] = useState('manual_follow_up');
  const [batchReviewTasks, setBatchReviewTasks] = useState<ReviewTaskDetail[]>([]);
  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<ReviewTaskDetail | null>(null);
  const [viewingEvidenceLink, setViewingEvidenceLink] = useState<
    AutoCollectedEvidenceLink['link'] | null
  >(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const viewingPolicyDetail = useQuery(
    api.securityPolicies.getSecurityPolicyDetail,
    viewingTask?.policy ? { policyId: viewingTask.policy.policyId } : 'skip',
  ) as SecurityPolicyDetail | null | undefined;

  const viewingReportDetail = useQuery(
    api.securityReports.getEvidenceReportDetail,
    viewingEvidenceLink?.sourceType === 'evidence_report' ||
      viewingEvidenceLink?.sourceType === 'backup_verification_report'
      ? { id: viewingEvidenceLink.sourceId as Id<'evidenceReports'> }
      : 'skip',
  ) as EvidenceReportDetail | null | undefined;

  const reviewsInitializedRef = useRef(false);
  const reviewsRefreshedForRunRef = useRef<string | null>(null);

  // --- Reviews effects ---
  useEffect(() => {
    if (currentAnnualReviewRunQuery !== undefined) {
      setLocalAnnualReviewRun(currentAnnualReviewRunQuery);
    }
  }, [currentAnnualReviewRunQuery]);

  useEffect(() => {
    if (currentAnnualReviewDetailQuery !== undefined) {
      setLocalAnnualReviewDetail(currentAnnualReviewDetailQuery);
    }
  }, [currentAnnualReviewDetailQuery]);

  useEffect(() => {
    if (triggeredReviewRuns !== undefined) {
      setLocalTriggeredReviewRuns((current) =>
        mergeReviewRunSummaries(current, triggeredReviewRuns),
      );
    }
  }, [triggeredReviewRuns]);

  useEffect(() => {
    if (selectedReviewRunDetailQuery !== undefined) {
      setLocalSelectedReviewRunDetail(selectedReviewRunDetailQuery);
    }
  }, [selectedReviewRunDetailQuery]);

  useEffect(() => {
    if (reviewsInitializedRef.current) {
      return;
    }
    if (currentAnnualReviewRunQuery === undefined) {
      return;
    }
    if (currentAnnualReviewRunQuery !== null) {
      reviewsInitializedRef.current = true;
      return;
    }

    reviewsInitializedRef.current = true;
    setIsPreparingAnnualReview(true);
    void ensureCurrentAnnualReviewRun({})
      .then(async (run) => {
        setLocalAnnualReviewRun(run);
        const detail = await refreshReviewRunAutomation({
          reviewRunId: run.id as Id<'reviewRuns'>,
        });
        if (detail) {
          setLocalAnnualReviewDetail(detail);
          setLocalAnnualReviewRun(mergeReviewRunSummaryWithDetail(run, detail));
        }
      })
      .catch((error: unknown) => {
        reviewsInitializedRef.current = false;
        showToast(
          error instanceof Error ? error.message : 'Failed to initialize annual review.',
          'error',
        );
      })
      .finally(() => {
        setIsPreparingAnnualReview(false);
      });
  }, [
    currentAnnualReviewRunQuery,
    ensureCurrentAnnualReviewRun,
    refreshReviewRunAutomation,
    showToast,
  ]);

  useEffect(() => {
    if (!currentAnnualReviewRun?.id) {
      return;
    }
    if (reviewsRefreshedForRunRef.current === currentAnnualReviewRun.id) {
      return;
    }

    reviewsRefreshedForRunRef.current = currentAnnualReviewRun.id;
    void refreshReviewRunAutomation({
      reviewRunId: currentAnnualReviewRun.id as Id<'reviewRuns'>,
    })
      .then((detail) => {
        if (detail) {
          setLocalAnnualReviewDetail(detail);
          setLocalAnnualReviewRun((current) => mergeReviewRunSummaryWithDetail(current, detail));
        }
      })
      .catch((error: unknown) => {
        reviewsRefreshedForRunRef.current = null;
        showToast(
          error instanceof Error ? error.message : 'Failed to refresh review evidence.',
          'error',
        );
      });
  }, [currentAnnualReviewRun?.id, refreshReviewRunAutomation, showToast]);

  const reviewTaskGroups = useMemo(
    () => ({
      autoCollected:
        currentAnnualReviewDetail?.tasks.filter(
          (task) =>
            task.taskType === 'automated_check' &&
            task.status !== 'completed' &&
            task.status !== 'exception',
        ) ?? [],
      blocked:
        currentAnnualReviewDetail?.tasks.filter(
          (task) =>
            task.status === 'blocked' && task.findingsSummary === null && task.vendor === null,
        ) ?? [],
      completed:
        currentAnnualReviewDetail?.tasks.filter(
          (task) => task.status === 'completed' || task.status === 'exception',
        ) ?? [],
      findingsReview:
        currentAnnualReviewDetail?.tasks.filter((task) => task.findingsSummary !== null) ?? [],
      needsAttestation:
        currentAnnualReviewDetail?.tasks.filter(
          (task) =>
            task.taskType === 'attestation' &&
            task.status !== 'completed' &&
            task.findingsSummary === null &&
            task.vendor === null,
        ) ?? [],
      needsDocumentUpload:
        currentAnnualReviewDetail?.tasks.filter(
          (task) => task.taskType === 'document_upload' && task.status !== 'completed',
        ) ?? [],
      vendorReviews: currentAnnualReviewDetail?.tasks.filter((task) => task.vendor !== null) ?? [],
    }),
    [currentAnnualReviewDetail],
  );

  const reviewExceptionTasks = useMemo(
    () => currentAnnualReviewDetail?.tasks.filter((task) => task.status === 'exception') ?? [],
    [currentAnnualReviewDetail],
  );

  const reviewFinalizeState = useMemo(() => {
    const tasks = currentAnnualReviewDetail?.tasks ?? [];
    const requiredBlocked = tasks.filter((task) => task.required && task.status === 'blocked');
    const requiredRemaining = tasks.filter(
      (task) =>
        task.required &&
        task.status !== 'blocked' &&
        task.status !== 'completed' &&
        task.status !== 'exception',
    );
    const remainingByType = requiredRemaining.reduce(
      (counts, task) => {
        counts[task.taskType] += 1;
        return counts;
      },
      {
        attestation: 0,
        automated_check: 0,
        document_upload: 0,
        follow_up: 0,
      },
    );

    return {
      canFinalize: requiredBlocked.length === 0 && requiredRemaining.length === 0,
      remainingByType,
      requiredBlocked,
      requiredRemaining,
    };
  }, [currentAnnualReviewDetail]);

  const applyLocalTaskUpdate = useCallback(
    (taskId: string, updater: (task: ReviewTaskDetail) => ReviewTaskDetail) => {
      const updateDetail = (detail: ReviewRunDetail | null) => {
        if (!detail || !detail.tasks.some((task) => task.id === taskId)) {
          return detail;
        }

        return {
          ...detail,
          tasks: detail.tasks.map((task) => (task.id === taskId ? updater(task) : task)),
        };
      };

      setLocalAnnualReviewDetail((current) => {
        const next = updateDetail(current);
        if (next && current?.id === next.id) {
          setLocalAnnualReviewRun((run) => mergeReviewRunSummaryWithDetail(run, next));
        }
        return next;
      });

      setLocalSelectedReviewRunDetail((current) => {
        const next = updateDetail(current);
        if (next && next.kind === 'triggered') {
          setLocalTriggeredReviewRuns((runs) =>
            runs.map((run) =>
              run.id === next.id ? mergeReviewRunSummaryWithDetail(run, next) : run,
            ),
          );
        }
        return next;
      });
    },
    [],
  );

  const handleRefreshAnnualReview = useCallback(async () => {
    if (!currentAnnualReviewRun?.id) {
      return;
    }
    setBusyReviewRunAction('refresh');
    try {
      const detail = await refreshReviewRunAutomation({
        reviewRunId: currentAnnualReviewRun.id as Id<'reviewRuns'>,
      });
      if (detail) {
        setLocalAnnualReviewDetail(detail);
        setLocalAnnualReviewRun((current) => mergeReviewRunSummaryWithDetail(current, detail));
      }
      showToast('Annual review evidence refreshed.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to refresh annual review evidence.',
        'error',
      );
    } finally {
      setBusyReviewRunAction(null);
    }
  }, [currentAnnualReviewRun?.id, refreshReviewRunAutomation, showToast]);

  const handleFinalizeAnnualReview = useCallback(async () => {
    if (!currentAnnualReviewRun?.id) {
      return;
    }
    setBusyReviewRunAction('finalize');
    try {
      const detail = await finalizeReviewRunServerFn({
        data: {
          reviewRunId: currentAnnualReviewRun.id as Id<'reviewRuns'>,
        },
      });
      if (detail) {
        setLocalAnnualReviewDetail(detail);
        setLocalAnnualReviewRun((current) => mergeReviewRunSummaryWithDetail(current, detail));
      }
      showToast('Annual review finalized.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to finalize annual review.',
        'error',
      );
    } finally {
      setBusyReviewRunAction(null);
    }
  }, [currentAnnualReviewRun?.id, showToast]);

  const handleCreateTriggeredReviewRun = useCallback(async () => {
    const title = newTriggeredReviewTitle.trim();
    if (!title) {
      showToast('Triggered review title is required.', 'error');
      return;
    }
    setBusyReviewRunAction('create-triggered');
    try {
      const summary = await createTriggeredReviewRun({
        title,
        triggerType: newTriggeredReviewType,
      });
      setNewTriggeredReviewTitle('');
      setIsTriggeredReviewDialogOpen(false);
      setLocalTriggeredReviewRuns((current) => [
        summary,
        ...current.filter((run) => run.id !== summary.id),
      ]);
      setLocalSelectedReviewRunDetail(null);
      void navigate({
        search: {
          ...props.search,
          selectedReviewRun: summary.id,
        },
        to: getSecurityPath('reviews'),
      });
      showToast('Triggered review created.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create triggered review.',
        'error',
      );
    } finally {
      setBusyReviewRunAction(null);
    }
  }, [
    createTriggeredReviewRun,
    navigate,
    newTriggeredReviewTitle,
    newTriggeredReviewType,
    props.search,
    showToast,
  ]);

  const handleAttestTask = useCallback(
    async (task: ReviewTaskDetail) => {
      setBusyReviewTaskAction(`${task.id}:attest`);
      try {
        const document = reviewTaskDocuments[task.id] ?? {
          label: '',
          url: '',
          version: '',
        };
        await attestReviewTask({
          documentLabel:
            task.taskType === 'document_upload' || task.taskType === 'follow_up'
              ? document.label.trim() || undefined
              : undefined,
          documentUrl:
            task.taskType === 'document_upload' || task.taskType === 'follow_up'
              ? document.url.trim() || undefined
              : undefined,
          documentVersion:
            task.taskType === 'document_upload' || task.taskType === 'follow_up'
              ? document.version.trim() || undefined
              : undefined,
          note: reviewTaskNotes[task.id]?.trim() || undefined,
          reviewTaskId: task.id as Id<'reviewTasks'>,
        });
        showToast(
          task.taskType === 'follow_up'
            ? 'Triggered review task completed.'
            : task.taskType === 'document_upload'
              ? 'Document-linked review task completed.'
              : 'Review task attested.',
          'success',
        );
        applyLocalTaskUpdate(task.id, (current) => ({
          ...current,
          latestNote: reviewTaskNotes[task.id]?.trim() || current.latestNote,
          status: 'completed',
        }));
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Failed to save task attestation.',
          'error',
        );
      } finally {
        setBusyReviewTaskAction(null);
      }
    },
    [applyLocalTaskUpdate, attestReviewTask, reviewTaskDocuments, reviewTaskNotes, showToast],
  );

  const handleExceptionTask = useCallback(
    async (task: ReviewTaskDetail) => {
      setBusyReviewTaskAction(`${task.id}:exception`);
      try {
        await setReviewTaskException({
          note: reviewTaskNotes[task.id]?.trim() || '',
          reviewTaskId: task.id as Id<'reviewTasks'>,
        });
        showToast('Task exception recorded.', 'success');
        applyLocalTaskUpdate(task.id, (current) => ({
          ...current,
          latestNote: reviewTaskNotes[task.id]?.trim() || current.latestNote,
          status: 'exception',
        }));
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Failed to mark task exception.',
          'error',
        );
      } finally {
        setBusyReviewTaskAction(null);
      }
    },
    [applyLocalTaskUpdate, reviewTaskNotes, setReviewTaskException, showToast],
  );

  const handleOpenReviewFollowUp = useCallback(
    async (task: ReviewTaskDetail) => {
      setBusyReviewTaskAction(`${task.id}:follow-up`);
      try {
        const summary = await openTriggeredFollowUp({
          note: reviewTaskNotes[task.id]?.trim() || undefined,
          reviewTaskId: task.id as Id<'reviewTasks'>,
        });
        setLocalTriggeredReviewRuns((current) => [
          summary,
          ...current.filter((run) => run.id !== summary.id),
        ]);
        setLocalSelectedReviewRunDetail(null);
        void navigate({
          search: {
            ...props.search,
            selectedReviewRun: summary.id,
          },
          to: getSecurityPath('reviews'),
        });
        showToast('Triggered follow-up created.', 'success');
        applyLocalTaskUpdate(task.id, (current) => ({
          ...current,
          latestNote: reviewTaskNotes[task.id]?.trim() || current.latestNote,
          status: 'exception',
        }));
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Failed to create triggered follow-up.',
          'error',
        );
      } finally {
        setBusyReviewTaskAction(null);
      }
    },
    [
      applyLocalTaskUpdate,
      navigate,
      openTriggeredFollowUp,
      props.search,
      reviewTaskNotes,
      showToast,
    ],
  );

  const handleFinalizeSelectedReviewRun = useCallback(async () => {
    if (!selectedReviewRunDetail?.id) {
      return;
    }
    setBusyReviewRunAction(`finalize:${selectedReviewRunDetail.id}`);
    try {
      const detail = await finalizeReviewRunServerFn({
        data: {
          reviewRunId: selectedReviewRunDetail.id as Id<'reviewRuns'>,
        },
      });
      if (detail) {
        setLocalSelectedReviewRunDetail(detail);
        if (detail.kind === 'annual') {
          setLocalAnnualReviewDetail(detail);
          setLocalAnnualReviewRun((current) => mergeReviewRunSummaryWithDetail(current, detail));
        } else {
          setLocalTriggeredReviewRuns((current) =>
            current.map((run) =>
              run.id === detail.id ? mergeReviewRunSummaryWithDetail(run, detail) : run,
            ),
          );
        }
      }
      showToast(
        selectedReviewRunDetail.kind === 'triggered'
          ? 'Triggered review finalized.'
          : 'Review finalized.',
        'success',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to finalize review.', 'error');
    } finally {
      setBusyReviewRunAction(null);
    }
  }, [selectedReviewRunDetail, showToast]);

  const handleOpenBatchReview = useCallback((tasks: ReviewTaskDetail[]) => {
    setBatchReviewTasks(tasks);
    setIsBatchReviewOpen(true);
  }, []);

  const handleViewTaskSource = useCallback((task: ReviewTaskDetail) => {
    setViewingTask(task);
  }, []);

  const handleViewEvidenceLink = useCallback((link: AutoCollectedEvidenceLink['link']) => {
    setViewingEvidenceLink(link);
  }, []);

  const handleRecheckTask = useCallback(
    async (task: ReviewTaskDetail) => {
      await handleRefreshAnnualReview();
      setFocusTaskId(task.id);
    },
    [handleRefreshAnnualReview],
  );

  const handleJumpToTask = useCallback((taskId: string) => {
    setFocusTaskId(taskId);
  }, []);

  const handleFocusTaskHandled = useCallback((taskId: string) => {
    setFocusTaskId((current) => (current === taskId ? null : current));
  }, []);

  const handleOpenBackupDetails = useCallback(() => {
    void navigate({
      search: {},
      to: getSecurityPath('reports'),
    });
  }, [navigate]);

  return (
    <>
      <AdminSecurityReviewsTab
        batchReviewTasks={batchReviewTasks}
        busyReviewRunAction={busyReviewRunAction}
        busyReviewTaskAction={busyReviewTaskAction}
        currentAnnualReviewRun={currentAnnualReviewRun}
        focusTaskId={focusTaskId}
        isDetailLoading={
          currentAnnualReviewRunQuery === undefined ||
          isPreparingAnnualReview ||
          (currentAnnualReviewRun !== null && currentAnnualReviewDetailQuery === undefined)
        }
        isBatchReviewOpen={isBatchReviewOpen}
        isTriggeredReviewDialogOpen={isTriggeredReviewDialogOpen}
        onBatchReviewOpenChange={setIsBatchReviewOpen}
        onOpenBatchReview={handleOpenBatchReview}
        onSelectTriggeredReviewRun={(reviewRunId) => {
          setLocalSelectedReviewRunDetail(null);
          void navigate({
            search: {
              ...props.search,
              selectedReviewRun: reviewRunId,
            },
            to: getSecurityPath('reviews'),
          });
        }}
        onTriggeredReviewDialogOpenChange={setIsTriggeredReviewDialogOpen}
        handleAttestTask={handleAttestTask}
        handleCreateTriggeredReviewRun={handleCreateTriggeredReviewRun}
        handleExceptionTask={handleExceptionTask}
        handleFinalizeAnnualReview={handleFinalizeAnnualReview}
        handleOpenReviewFollowUp={handleOpenReviewFollowUp}
        handleRecheckTask={handleRecheckTask}
        handleRefreshAnnualReview={handleRefreshAnnualReview}
        isPreparingAnnualReview={isPreparingAnnualReview}
        navigateToControl={navigateToControl}
        onFocusTaskHandled={handleFocusTaskHandled}
        onJumpToTask={handleJumpToTask}
        onViewEvidenceLink={handleViewEvidenceLink}
        onViewTaskSource={handleViewTaskSource}
        newTriggeredReviewTitle={newTriggeredReviewTitle}
        newTriggeredReviewType={newTriggeredReviewType}
        onChangeDocumentField={(taskId, field, value) => {
          setReviewTaskDocuments((current) => ({
            ...current,
            [taskId]: {
              label: current[taskId]?.label ?? '',
              url: current[taskId]?.url ?? '',
              version: current[taskId]?.version ?? '',
              [field]: value,
            },
          }));
        }}
        onChangeNote={(taskId, value) => {
          setReviewTaskNotes((current) => ({
            ...current,
            [taskId]: value,
          }));
        }}
        reviewExceptionTasks={reviewExceptionTasks}
        reviewFinalizeState={reviewFinalizeState}
        reviewTaskDocuments={reviewTaskDocuments}
        reviewTaskGroups={reviewTaskGroups}
        reviewTaskNotes={reviewTaskNotes}
        setNewTriggeredReviewTitle={setNewTriggeredReviewTitle}
        setNewTriggeredReviewType={setNewTriggeredReviewType}
        triggeredReviewRuns={resolvedTriggeredReviewRuns}
      />

      {/* Review run detail sheet */}
      <Sheet
        open={props.search.selectedReviewRun !== undefined}
        onOpenChange={(open) => {
          if (open) {
            return;
          }

          void navigate({
            search: {
              ...props.search,
              selectedReviewRun: undefined,
            },
            to: getSecurityPath('reviews'),
          });
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Review run detail</SheetTitle>
            <SheetDescription>
              Review the selected annual or triggered review run and the task set it owns.
            </SheetDescription>
          </SheetHeader>
          {selectedReviewRunDetail === undefined && props.search.selectedReviewRun ? (
            <DetailLoadingState label="Loading review run detail" />
          ) : selectedReviewRunDetail ? (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-start justify-between gap-4 pr-12">
                  <div className="space-y-1">
                    <SheetTitle>
                      {selectedReviewRunSummary?.title ?? selectedReviewRunDetail.id}
                    </SheetTitle>
                    <SheetDescription>
                      {(selectedReviewRunSummary?.kind ?? selectedReviewRunDetail.kind) ===
                      'triggered'
                        ? 'Standalone follow-up review run'
                        : 'Annual review run'}
                    </SheetDescription>
                    <p className="text-xs text-muted-foreground">
                      Created{' '}
                      {new Date(
                        selectedReviewRunSummary?.createdAt ?? selectedReviewRunDetail.createdAt,
                      ).toLocaleString()}
                      {selectedReviewRunSummary?.triggerType
                        ? ` · Trigger ${selectedReviewRunSummary.triggerType}`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    variant={getReviewRunStatusBadgeVariant(
                      selectedReviewRunSummary?.status ?? selectedReviewRunDetail.status,
                    )}
                  >
                    {formatReviewRunStatus(
                      selectedReviewRunSummary?.status ?? selectedReviewRunDetail.status,
                    )}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-6 p-4">
                {(() => {
                  const finalizeState = buildReviewFinalizeState(selectedReviewRunDetail);
                  const blockingMessage = getReviewRunBlockingMessage(selectedReviewRunDetail);
                  const isTriggeredRun = selectedReviewRunDetail.kind === 'triggered';

                  if (!isTriggeredRun) {
                    return null;
                  }

                  return (
                    <DetailSection title="Triggered review lifecycle">
                      <div className="space-y-4 rounded-md border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="text-sm text-muted-foreground">
                            Resolve the follow-up task, document the outcome, then finalize this
                            standalone review.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              busyReviewRunAction !== null ||
                              selectedReviewRunDetail.finalizedAt !== null ||
                              !finalizeState.canFinalize
                            }
                            onClick={() => {
                              void handleFinalizeSelectedReviewRun();
                            }}
                          >
                            {busyReviewRunAction === `finalize:${selectedReviewRunDetail.id}`
                              ? 'Finalizing...'
                              : 'Finalize review'}
                          </Button>
                        </div>
                        {blockingMessage ? (
                          <Alert variant="info">
                            <AlertTitle>Finalize is not available yet</AlertTitle>
                            <AlertDescription>{blockingMessage}</AlertDescription>
                          </Alert>
                        ) : null}
                      </div>
                    </DetailSection>
                  );
                })()}

                <DetailSection title="Tasks">
                  {selectedReviewRunDetail.tasks.length ? (
                    selectedReviewRunDetail.tasks.map((task, index) => (
                      <div
                        key={`${selectedReviewRunDetail.id}:${task.id}:${index}`}
                        className="space-y-4 rounded-md border p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{task.title}</p>
                              <Badge variant={getReviewTaskBadgeVariant(task)}>
                                {getReviewTaskStatusLabel(task)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>
                          {task.vendor ? (
                            <Badge variant="secondary">{task.vendor.title}</Badge>
                          ) : null}
                        </div>
                        {task.latestNote ? (
                          <DetailItem label="Latest note" value={task.latestNote} />
                        ) : null}
                        {task.evidenceLinks.length ? (
                          <div className="flex flex-wrap gap-2">
                            {task.evidenceLinks.map((link) => (
                              <Button
                                key={link.id}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  handleViewEvidenceLink(link);
                                }}
                              >
                                View evidence
                              </Button>
                            ))}
                          </div>
                        ) : null}
                        {task.controlLinks.length ? (
                          <div className="flex flex-wrap gap-2">
                            {task.controlLinks.map((link) => (
                              <Button
                                key={`${task.id}:${link.internalControlId}:${link.itemId}`}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigateToControl(link.internalControlId);
                                }}
                              >
                                {link.nist80053Id ?? link.internalControlId}
                                {link.itemLabel ? ` · ${link.itemLabel}` : ''}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                        {selectedReviewRunDetail.kind === 'triggered' &&
                        task.status !== 'completed' &&
                        task.status !== 'exception' ? (
                          <div className="space-y-4 rounded-md border bg-muted/10 p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Resolution note</p>
                              <Textarea
                                value={reviewTaskNotes[task.id] ?? ''}
                                onChange={(event) => {
                                  setReviewTaskNotes((current) => ({
                                    ...current,
                                    [task.id]: event.target.value,
                                  }));
                                }}
                                placeholder="Describe the follow-up work, the evidence reviewed, or why this run needs an exception."
                              />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Evidence label</p>
                                <Input
                                  value={reviewTaskDocuments[task.id]?.label ?? ''}
                                  onChange={(event) => {
                                    setReviewTaskDocuments((current) => ({
                                      ...current,
                                      [task.id]: {
                                        label: event.target.value,
                                        url: current[task.id]?.url ?? '',
                                        version: current[task.id]?.version ?? '',
                                      },
                                    }));
                                  }}
                                  placeholder="Optional evidence label"
                                />
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Evidence URL</p>
                                <Input
                                  value={reviewTaskDocuments[task.id]?.url ?? ''}
                                  onChange={(event) => {
                                    setReviewTaskDocuments((current) => ({
                                      ...current,
                                      [task.id]: {
                                        label: current[task.id]?.label ?? '',
                                        url: event.target.value,
                                        version: current[task.id]?.version ?? '',
                                      },
                                    }));
                                  }}
                                  placeholder="Optional evidence URL"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyReviewTaskAction !== null}
                                onClick={() => {
                                  void handleAttestTask(task);
                                }}
                              >
                                {busyReviewTaskAction === `${task.id}:attest`
                                  ? 'Saving...'
                                  : 'Mark complete'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  busyReviewTaskAction !== null ||
                                  !(reviewTaskNotes[task.id]?.trim() ?? '')
                                }
                                onClick={() => {
                                  void handleExceptionTask(task);
                                }}
                              >
                                {busyReviewTaskAction === `${task.id}:exception`
                                  ? 'Saving...'
                                  : 'Mark exception'}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tasks are attached to this run.
                    </p>
                  )}
                </DetailSection>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Task source detail sheet (policy / vendor / findings) */}
      <Sheet
        open={viewingTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingTask(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {viewingTask?.policy ? (
            viewingPolicyDetail === undefined ? (
              <DetailLoadingState label="Loading policy detail" />
            ) : viewingPolicyDetail ? (
              <AdminSecurityPolicyDetail
                onOpenControl={navigateToControl}
                policy={viewingPolicyDetail}
                reviewStatusSlot={
                  <PolicyReviewStatus
                    task={viewingTask}
                    liveTask={currentAnnualReviewDetail?.tasks.find((t) => t.id === viewingTask.id)}
                    policy={viewingPolicyDetail}
                    onAttest={handleAttestTask}
                    busyAction={busyReviewTaskAction}
                  />
                }
              >
                {viewingPolicyDetail.sourceMarkdown ? (
                  <PolicySourceCollapsible policy={viewingPolicyDetail} />
                ) : null}
              </AdminSecurityPolicyDetail>
            ) : (
              <SheetHeader>
                <SheetTitle>Policy not found</SheetTitle>
                <SheetDescription>The linked policy could not be loaded.</SheetDescription>
              </SheetHeader>
            )
          ) : viewingTask ? (
            (() => {
              const liveTask =
                currentAnnualReviewDetail?.tasks.find((task) => task.id === viewingTask.id) ??
                viewingTask;
              const isBackupVerificationTask =
                liveTask.templateKey === 'annual:auto:backup-verification';
              const isReleaseProvenanceTask =
                liveTask.templateKey === 'annual:auto:release-provenance';
              const latestEvidenceTimestamp =
                liveTask.evidenceLinks.find((link) => typeof link.freshAt === 'number')?.freshAt ??
                (isBackupVerificationTask
                  ? (auditReadiness?.latestBackupDrill?.checkedAt ?? null)
                  : null);
              const blockerSummary =
                isBackupVerificationTask && auditReadiness?.latestBackupDrill === null
                  ? 'Blocked: no backup verification record was found.'
                  : liveTask.latestNote;

              return (
                <div className="space-y-6">
                  <SheetHeader className="border-b">
                    <div className="space-y-2 pr-12">
                      <div className="flex flex-wrap items-center gap-2">
                        <SheetTitle>{liveTask.title}</SheetTitle>
                        <Badge variant={getReviewTaskBadgeVariant(liveTask)}>
                          {getReviewTaskStatusLabel(liveTask)}
                        </Badge>
                      </div>
                      <SheetDescription>{liveTask.description}</SheetDescription>
                    </div>
                  </SheetHeader>

                  <div className="space-y-6 p-4">
                    <DetailSection title="Status">
                      <div className="space-y-3 text-sm">
                        {blockerSummary ? (
                          <DetailItem label="Current blocker" value={blockerSummary} />
                        ) : null}
                        {isBackupVerificationTask ? (
                          <DetailItem
                            label="Source"
                            value="Weekly GitHub backup workflow and retained restore drill record"
                          />
                        ) : null}
                        {isReleaseProvenanceTask ? (
                          <DetailItem
                            label="Source"
                            value="Release provenance evidence in the CM-003 control workspace"
                          />
                        ) : null}
                        {latestEvidenceTimestamp ? (
                          <DetailItem
                            label={
                              liveTask.status === 'blocked' ? 'Last checked' : 'Last fresh evidence'
                            }
                            value={new Date(latestEvidenceTimestamp).toLocaleString()}
                          />
                        ) : null}
                      </div>
                    </DetailSection>

                    <DetailSection title="Actions">
                      <div className="flex flex-wrap gap-2">
                        {isBackupVerificationTask ? (
                          <Button type="button" variant="outline" onClick={handleOpenBackupDetails}>
                            Open restore drill details
                          </Button>
                        ) : null}
                        {isBackupVerificationTask &&
                        auditReadiness?.latestBackupDrill?.workflowRunUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              window.open(
                                auditReadiness.latestBackupDrill?.workflowRunUrl ?? '',
                                '_blank',
                                'noopener,noreferrer',
                              );
                            }}
                          >
                            Open workflow run
                          </Button>
                        ) : null}
                        {liveTask.controlLinks.length ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              navigateToControl(liveTask.controlLinks[0]!.internalControlId);
                            }}
                          >
                            Open linked control
                          </Button>
                        ) : null}
                        {liveTask.status === 'blocked' &&
                        liveTask.taskType === 'automated_check' ? (
                          <Button
                            type="button"
                            disabled={busyReviewRunAction !== null}
                            onClick={() => {
                              void handleRecheckTask(liveTask);
                            }}
                          >
                            {busyReviewRunAction === 'refresh' ? 'Rechecking...' : 'Recheck now'}
                          </Button>
                        ) : null}
                      </div>
                    </DetailSection>

                    {liveTask.allowException &&
                    liveTask.status !== 'completed' &&
                    liveTask.status !== 'exception' ? (
                      <DetailSection title="Disposition">
                        <div className="space-y-4 rounded-md border p-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Disposition note</p>
                            <Textarea
                              value={reviewTaskNotes[liveTask.id] ?? ''}
                              onChange={(event) => {
                                setReviewTaskNotes((current) => ({
                                  ...current,
                                  [liveTask.id]: event.target.value,
                                }));
                              }}
                              placeholder="Add context for a follow-up review or explain why this task needs an exception."
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busyReviewTaskAction !== null}
                              onClick={() => {
                                void handleOpenReviewFollowUp(liveTask);
                              }}
                            >
                              {busyReviewTaskAction === `${liveTask.id}:follow-up`
                                ? 'Opening...'
                                : 'Create follow-up review'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={
                                busyReviewTaskAction !== null ||
                                !(reviewTaskNotes[liveTask.id]?.trim() ?? '')
                              }
                              onClick={() => {
                                void handleExceptionTask(liveTask);
                              }}
                            >
                              {busyReviewTaskAction === `${liveTask.id}:exception`
                                ? 'Saving...'
                                : 'Mark exception'}
                            </Button>
                          </div>
                        </div>
                      </DetailSection>
                    ) : null}
                  </div>
                </div>
              );
            })()
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Evidence link detail sheet */}
      <Sheet
        open={viewingEvidenceLink !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingEvidenceLink(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {viewingReportDetail === undefined && viewingEvidenceLink ? (
            <DetailLoadingState label="Loading evidence report" />
          ) : viewingReportDetail ? (
            <AdminSecurityReportDetail
              generatedReport={viewingReportDetail.contentJson ?? null}
              onOpenControl={navigateToControl}
              onOpenReviewRun={(reviewRunId) => {
                setViewingEvidenceLink(null);
                void navigate({
                  search: {
                    ...props.search,
                    selectedReviewRun: reviewRunId,
                  },
                  to: getSecurityPath('reviews'),
                });
              }}
              report={viewingReportDetail}
            />
          ) : viewingEvidenceLink ? (
            <SheetHeader>
              <SheetTitle>{viewingEvidenceLink.sourceLabel}</SheetTitle>
              <SheetDescription>
                Details for this evidence type are not available inline.
              </SheetDescription>
            </SheetHeader>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function buildReviewFinalizeState(reviewRunDetail: ReviewRunDetail) {
  const requiredBlocked = reviewRunDetail.tasks.filter(
    (task) => task.required && task.status === 'blocked',
  );
  const requiredRemaining = reviewRunDetail.tasks.filter(
    (task) =>
      task.required &&
      task.status !== 'blocked' &&
      task.status !== 'completed' &&
      task.status !== 'exception',
  );

  return {
    canFinalize: requiredBlocked.length === 0 && requiredRemaining.length === 0,
    requiredBlocked,
    requiredRemaining,
  };
}

function getReviewRunBlockingMessage(reviewRunDetail: ReviewRunDetail) {
  const finalizeState = buildReviewFinalizeState(reviewRunDetail);
  const blockingTask = finalizeState.requiredBlocked[0];
  if (blockingTask) {
    return `Finalize is blocked by "${blockingTask.title}".`;
  }

  const incompleteTask = finalizeState.requiredRemaining[0];
  if (incompleteTask) {
    return `Finalize requires "${incompleteTask.title}" to be completed first.`;
  }

  return null;
}

function mergeReviewRunSummaries(
  currentRuns: ReviewRunSummary[],
  incomingRuns: ReviewRunSummary[],
) {
  const merged = new Map<string, ReviewRunSummary>();

  for (const run of currentRuns) {
    merged.set(run.id, run);
  }
  for (const run of incomingRuns) {
    merged.set(run.id, run);
  }

  return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function DetailSection(props: { children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{props.title}</h3>
      {props.children}
    </section>
  );
}

function DetailItem(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {props.label}
      </p>
      <div className="text-sm">{props.value}</div>
    </div>
  );
}

function PolicyReviewStatus(props: {
  busyAction: string | null;
  liveTask?: ReviewTaskDetail;
  onAttest: (task: ReviewTaskDetail) => Promise<void>;
  policy: SecurityPolicyDetail;
  task: ReviewTaskDetail;
}) {
  const { task, policy, busyAction } = props;
  const liveTask = props.liveTask ?? task;
  const isBusy = busyAction === `${task.id}:attest`;

  const attestationHistory = useQuery(api.securityReviews.getReviewTaskAttestationHistory, {
    reviewTaskId: task.id as Id<'reviewTasks'>,
  });

  const liveCanAttest =
    liveTask.status === 'ready' &&
    liveTask.taskType !== 'automated_check' &&
    liveTask.taskType !== 'follow_up';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Reviews</h3>
        <div className="flex items-center gap-2">
          {!liveCanAttest ? (
            <Badge variant={getReviewTaskBadgeVariant(liveTask)}>
              {getReviewTaskStatusLabel(liveTask)}
            </Badge>
          ) : null}
          {liveCanAttest ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={isBusy}>
                  {isBusy ? 'Saving…' : 'Attest to review'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm attestation</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are attesting that you have reviewed{' '}
                    <strong>{task.policy?.title ?? task.title}</strong> and it remains current.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isBusy}
                    onClick={() => {
                      void props.onAttest(task);
                    }}
                  >
                    {isBusy ? 'Saving…' : 'Confirm'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next review
          </dt>
          <dd className="text-sm text-foreground">
            {policy.nextReviewAt
              ? new Date(policy.nextReviewAt).toLocaleDateString()
              : 'Not scheduled'}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Review cycle
          </dt>
          <dd className="text-sm text-foreground">Annual</dd>
        </div>
      </dl>

      {attestationHistory && attestationHistory.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Past attestations
          </p>
          <div className="space-y-1">
            {attestationHistory.map(
              (entry: { attestedAt: number; attestedByDisplay: string | null }, index: number) => (
                <div
                  key={`attestation-${index}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {entry.attestedByDisplay ?? 'Unknown'}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(entry.attestedAt).toLocaleString()}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
