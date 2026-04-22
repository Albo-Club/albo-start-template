import { Loader2 } from 'lucide-react';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { AdminSecurityBatchReview } from '~/features/security/components/AdminSecurityBatchReview';
import { AdminSecurityTabHeader } from '~/features/security/components/AdminSecurityTabHeader';
import {
  formatReviewRunStatus,
  formatReviewTaskStatus,
  getReviewRunStatusBadgeVariant,
  getReviewTaskBadgeVariant,
  getReviewTaskStatusLabel,
} from '~/features/security/formatters';
import type { ReviewRunSummary, ReviewTaskDetail } from '~/features/security/types';

export type ReviewFinalizeState = {
  canFinalize: boolean;
  requiredBlocked: ReviewTaskDetail[];
  requiredRemaining: ReviewTaskDetail[];
  remainingByType: {
    attestation: number;
    automated_check: number;
    document_upload: number;
    follow_up: number;
  };
};

export type ReviewTaskGroups = {
  autoCollected: ReviewTaskDetail[];
  blocked: ReviewTaskDetail[];
  completed: ReviewTaskDetail[];
  findingsReview: ReviewTaskDetail[];
  needsAttestation: ReviewTaskDetail[];
  needsDocumentUpload: ReviewTaskDetail[];
  vendorReviews: ReviewTaskDetail[];
};

export type AutoCollectedEvidenceLink = {
  reviewTaskId: string;
  link: {
    freshAt: number | null;
    id: string;
    linkedAt: number;
    sourceId: string;
    sourceLabel: string;
    sourceType:
      | 'security_control_evidence'
      | 'evidence_report'
      | 'security_finding'
      | 'backup_verification_report'
      | 'external_document'
      | 'review_task'
      | 'vendor';
  };
  taskTitle: string;
};

export function AdminSecurityReviewsTab(props: {
  busyReviewRunAction: string | null;
  busyReviewTaskAction: string | null;
  currentAnnualReviewRun: ReviewRunSummary | null;
  focusTaskId: string | null;
  isDetailLoading: boolean;
  isTriggeredReviewDialogOpen: boolean;
  isPreparingAnnualReview: boolean;
  newTriggeredReviewTitle: string;
  newTriggeredReviewType: string;
  reviewExceptionTasks: ReviewTaskDetail[];
  reviewFinalizeState: ReviewFinalizeState;
  reviewTaskDocuments: Record<string, { label: string; url: string; version: string }>;
  reviewTaskGroups: ReviewTaskGroups;
  reviewTaskNotes: Record<string, string>;
  triggeredReviewRuns: ReviewRunSummary[] | undefined;
  batchReviewTasks: ReviewTaskDetail[];
  isBatchReviewOpen: boolean;
  onBatchReviewOpenChange: (open: boolean) => void;
  onOpenBatchReview: (tasks: ReviewTaskDetail[]) => void;
  onSelectTriggeredReviewRun: (reviewRunId: string) => void;
  onTriggeredReviewDialogOpenChange: (open: boolean) => void;
  handleAttestTask: (task: ReviewTaskDetail) => Promise<void>;
  handleCreateTriggeredReviewRun: () => Promise<void>;
  handleExceptionTask: (task: ReviewTaskDetail) => Promise<void>;
  handleFinalizeAnnualReview: () => Promise<void>;
  handleOpenReviewFollowUp: (task: ReviewTaskDetail) => Promise<void>;
  handleRecheckTask: (task: ReviewTaskDetail) => Promise<void>;
  handleRefreshAnnualReview: () => Promise<void>;
  navigateToControl: (internalControlId: string) => void;
  onChangeDocumentField: (
    taskId: string,
    field: 'label' | 'url' | 'version',
    value: string,
  ) => void;
  onChangeNote: (taskId: string, value: string) => void;
  onFocusTaskHandled: (taskId: string) => void;
  onJumpToTask: (taskId: string) => void;
  onViewEvidenceLink: (link: AutoCollectedEvidenceLink['link']) => void;
  onViewTaskSource: (task: ReviewTaskDetail) => void;
  setNewTriggeredReviewTitle: Dispatch<SetStateAction<string>>;
  setNewTriggeredReviewType: Dispatch<SetStateAction<string>>;
}) {
  return (
    <>
      <AdminSecurityTabHeader
        title="Reviews"
        description="Annual revalidation status, triggered follow-up runs, and evidence collection for the security program."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Follow-Ups</CardTitle>
            <CardDescription>
              Follow-up reviews track work that should continue outside the annual cycle.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={props.busyReviewRunAction !== null}
            onClick={() => {
              props.onTriggeredReviewDialogOpenChange(true);
            }}
          >
            Create follow-up review
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog
            open={props.isTriggeredReviewDialogOpen}
            onOpenChange={props.onTriggeredReviewDialogOpenChange}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create triggered review</DialogTitle>
                <DialogDescription>
                  Open a standalone follow-up review when a task needs work that should continue
                  outside this annual review.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Title</p>
                  <Input
                    value={props.newTriggeredReviewTitle}
                    onChange={(event) => {
                      props.setNewTriggeredReviewTitle(event.target.value);
                    }}
                    placeholder="Triggered review title"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Trigger type</p>
                  <Select
                    value={props.newTriggeredReviewType}
                    onValueChange={props.setNewTriggeredReviewType}
                  >
                    <SelectTrigger aria-label="Triggered review type">
                      <SelectValue placeholder="Trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_follow_up">Manual follow-up</SelectItem>
                      <SelectItem value="remediation_follow_up">Remediation</SelectItem>
                      <SelectItem value="termination_follow_up">Termination</SelectItem>
                      <SelectItem value="certificate_operations">Certificate operations</SelectItem>
                      <SelectItem value="unsupported_component">Unsupported component</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    props.onTriggeredReviewDialogOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={props.busyReviewRunAction !== null}
                  onClick={() => {
                    void props.handleCreateTriggeredReviewRun();
                  }}
                >
                  {props.busyReviewRunAction === 'create-triggered' ? 'Creating...' : 'Create run'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {props.triggeredReviewRuns === undefined ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : props.triggeredReviewRuns.length ? (
            props.triggeredReviewRuns.map((run) => (
              <button
                key={run.id}
                type="button"
                className="hover:bg-accent/40 flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors"
                onClick={() => {
                  props.onSelectTriggeredReviewRun(run.id);
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{run.title}</p>
                    <Badge variant={getReviewRunStatusBadgeVariant(run.status)}>
                      {formatReviewRunStatus(run.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTriggeredReviewType(run.triggerType)} · Created{' '}
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-md border px-3 py-1 text-sm font-medium">Open</span>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No triggered reviews have been created yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exceptions</CardTitle>
          <CardDescription>
            Tasks already marked as exceptions stay here until their follow-up work is resolved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {props.isDetailLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : props.reviewExceptionTasks.length ? (
            props.reviewExceptionTasks.map((task, index) => (
              <div key={`review-exception-${task.id}-${index}`} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatReviewTaskStatus(task.status)}
                      {task.latestNote ? ` · ${task.latestNote}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={props.busyReviewTaskAction !== null}
                      onClick={() => {
                        void props.handleExceptionTask(task);
                      }}
                    >
                      {props.busyReviewTaskAction === `${task.id}:exception`
                        ? 'Saving...'
                        : 'Mark exception'}
                    </Button>
                    <Button
                      type="button"
                      disabled={props.busyReviewTaskAction !== null}
                      onClick={() => {
                        void props.handleOpenReviewFollowUp(task);
                      }}
                    >
                      {props.busyReviewTaskAction === `${task.id}:follow-up`
                        ? 'Opening...'
                        : 'Open triggered follow-up'}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No exceptions or open follow-up items are currently tracked.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{props.currentAnnualReviewRun?.title ?? 'Annual Review'}</CardTitle>
              {props.currentAnnualReviewRun && !props.isDetailLoading ? (
                <Badge
                  variant={getReviewRunStatusBadgeVariant(props.currentAnnualReviewRun.status)}
                >
                  {formatReviewRunStatus(props.currentAnnualReviewRun.status)}
                </Badge>
              ) : null}
            </div>
            <CardDescription>
              {props.currentAnnualReviewRun ? (
                <>
                  Created {new Date(props.currentAnnualReviewRun.createdAt).toLocaleString()}
                  {props.currentAnnualReviewRun.finalizedAt
                    ? ` · Finalized ${new Date(props.currentAnnualReviewRun.finalizedAt).toLocaleString()}`
                    : ''}
                </>
              ) : (
                'Revalidate the current evidence base, complete the required attestations and document links, and finalize the annual review record for this cycle.'
              )}
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!props.currentAnnualReviewRun?.id || props.busyReviewRunAction !== null}
              onClick={() => {
                void props.handleRefreshAnnualReview();
              }}
            >
              {props.busyReviewRunAction === 'refresh'
                ? 'Re-syncing...'
                : 'Re-sync automated evidence'}
            </Button>
            {props.reviewTaskGroups.needsAttestation.length +
              props.reviewTaskGroups.needsDocumentUpload.length >
            0 ? (
              <Button
                type="button"
                size="sm"
                disabled={!props.currentAnnualReviewRun?.id || props.busyReviewTaskAction !== null}
                onClick={() =>
                  props.onOpenBatchReview([
                    ...props.reviewTaskGroups.needsAttestation,
                    ...props.reviewTaskGroups.needsDocumentUpload,
                  ])
                }
              >
                Start batch review (
                {props.reviewTaskGroups.needsAttestation.length +
                  props.reviewTaskGroups.needsDocumentUpload.length}
                )
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={
                !props.currentAnnualReviewRun?.id ||
                props.busyReviewRunAction !== null ||
                !props.reviewFinalizeState.canFinalize
              }
              onClick={() => {
                void props.handleFinalizeAnnualReview();
              }}
            >
              {props.busyReviewRunAction === 'finalize'
                ? 'Finalizing...'
                : 'Finalize annual review'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewTasksCard
            busyReviewTaskAction={props.busyReviewTaskAction}
            busyReviewRunAction={props.busyReviewRunAction}
            completedTasks={props.reviewTaskGroups.completed}
            focusTaskId={props.focusTaskId}
            handleAttestTask={props.handleAttestTask}
            handleExceptionTask={props.handleExceptionTask}
            handleOpenReviewFollowUp={props.handleOpenReviewFollowUp}
            handleRecheckTask={props.handleRecheckTask}
            isDetailLoading={props.isDetailLoading}
            onChangeNote={props.onChangeNote}
            onFocusTaskHandled={props.onFocusTaskHandled}
            onJumpToTask={props.onJumpToTask}
            onViewEvidenceLink={props.onViewEvidenceLink}
            onViewTaskSource={props.onViewTaskSource}
            openTasks={Array.from(
              new Map(
                [
                  ...props.reviewTaskGroups.blocked,
                  ...props.reviewTaskGroups.needsAttestation,
                  ...props.reviewTaskGroups.needsDocumentUpload,
                  ...props.reviewTaskGroups.findingsReview,
                  ...props.reviewTaskGroups.vendorReviews,
                  ...props.reviewTaskGroups.autoCollected,
                ].map((task) => [task.id, task]),
              ).values(),
            )}
            reviewTaskNotes={props.reviewTaskNotes}
          />
        </CardContent>
      </Card>

      <AdminSecurityBatchReview
        busyAction={props.busyReviewTaskAction}
        onAttestTask={props.handleAttestTask}
        onOpenChange={props.onBatchReviewOpenChange}
        open={props.isBatchReviewOpen}
        tasks={props.batchReviewTasks}
      />
    </>
  );
}

function ReviewTasksCard(props: {
  busyReviewRunAction: string | null;
  busyReviewTaskAction: string | null;
  completedTasks: ReviewTaskDetail[];
  focusTaskId: string | null;
  handleAttestTask: (task: ReviewTaskDetail) => Promise<void>;
  handleExceptionTask: (task: ReviewTaskDetail) => Promise<void>;
  handleOpenReviewFollowUp: (task: ReviewTaskDetail) => Promise<void>;
  handleRecheckTask: (task: ReviewTaskDetail) => Promise<void>;
  isDetailLoading: boolean;
  onChangeNote: (taskId: string, value: string) => void;
  onFocusTaskHandled: (taskId: string) => void;
  onJumpToTask: (taskId: string) => void;
  onViewEvidenceLink: (link: AutoCollectedEvidenceLink['link']) => void;
  onViewTaskSource: (task: ReviewTaskDetail) => void;
  openTasks: ReviewTaskDetail[];
  reviewTaskNotes: Record<string, string>;
}) {
  const allTasks = Array.from(
    new Map([...props.openTasks, ...props.completedTasks].map((t) => [t.id, t])).values(),
  );
  const [activeTab, setActiveTab] = useState<'all' | 'done' | 'open'>('open');

  return (
    <>
      {props.isDetailLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === 'all' || value === 'done' || value === 'open') {
              setActiveTab(value);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="open">
              Open{props.openTasks.length > 0 ? ` (${props.openTasks.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="done">
              Done{props.completedTasks.length > 0 ? ` (${props.completedTasks.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="all">All ({allTasks.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="space-y-2">
            <ReviewTaskList
              busyReviewRunAction={props.busyReviewRunAction}
              tasks={props.openTasks}
              busyReviewTaskAction={props.busyReviewTaskAction}
              focusTaskId={props.focusTaskId}
              handleAttestTask={props.handleAttestTask}
              handleExceptionTask={props.handleExceptionTask}
              handleOpenReviewFollowUp={props.handleOpenReviewFollowUp}
              handleRecheckTask={props.handleRecheckTask}
              onChangeNote={props.onChangeNote}
              onFocusTaskHandled={props.onFocusTaskHandled}
              onViewEvidenceLink={props.onViewEvidenceLink}
              onViewTaskSource={props.onViewTaskSource}
              emptyMessage="No open tasks — all caught up."
              reviewTaskNotes={props.reviewTaskNotes}
            />
          </TabsContent>
          <TabsContent value="done" className="space-y-2">
            <ReviewTaskList
              busyReviewRunAction={props.busyReviewRunAction}
              tasks={props.completedTasks}
              busyReviewTaskAction={props.busyReviewTaskAction}
              focusTaskId={props.focusTaskId}
              handleAttestTask={props.handleAttestTask}
              handleExceptionTask={props.handleExceptionTask}
              handleOpenReviewFollowUp={props.handleOpenReviewFollowUp}
              handleRecheckTask={props.handleRecheckTask}
              onChangeNote={props.onChangeNote}
              onFocusTaskHandled={props.onFocusTaskHandled}
              onViewEvidenceLink={props.onViewEvidenceLink}
              onViewTaskSource={props.onViewTaskSource}
              emptyMessage="No completed tasks yet."
              reviewTaskNotes={props.reviewTaskNotes}
            />
          </TabsContent>
          <TabsContent value="all" className="space-y-2">
            <ReviewTaskList
              busyReviewRunAction={props.busyReviewRunAction}
              tasks={allTasks}
              busyReviewTaskAction={props.busyReviewTaskAction}
              focusTaskId={props.focusTaskId}
              handleAttestTask={props.handleAttestTask}
              handleExceptionTask={props.handleExceptionTask}
              handleOpenReviewFollowUp={props.handleOpenReviewFollowUp}
              handleRecheckTask={props.handleRecheckTask}
              onChangeNote={props.onChangeNote}
              onFocusTaskHandled={props.onFocusTaskHandled}
              onViewEvidenceLink={props.onViewEvidenceLink}
              onViewTaskSource={props.onViewTaskSource}
              emptyMessage="No tasks in the current review."
              reviewTaskNotes={props.reviewTaskNotes}
            />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

function ReviewTaskList(props: {
  busyReviewRunAction: string | null;
  busyReviewTaskAction: string | null;
  emptyMessage: string;
  focusTaskId: string | null;
  handleAttestTask: (task: ReviewTaskDetail) => Promise<void>;
  handleExceptionTask: (task: ReviewTaskDetail) => Promise<void>;
  handleOpenReviewFollowUp: (task: ReviewTaskDetail) => Promise<void>;
  handleRecheckTask: (task: ReviewTaskDetail) => Promise<void>;
  onChangeNote: (taskId: string, value: string) => void;
  onFocusTaskHandled: (taskId: string) => void;
  onViewEvidenceLink: (link: AutoCollectedEvidenceLink['link']) => void;
  onViewTaskSource: (task: ReviewTaskDetail) => void;
  reviewTaskNotes: Record<string, string>;
  tasks: ReviewTaskDetail[];
}) {
  const { focusTaskId, onFocusTaskHandled, tasks } = props;

  useEffect(() => {
    if (!focusTaskId) {
      return;
    }

    const element = document.getElementById(getReviewTaskElementId(focusTaskId));
    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    onFocusTaskHandled(focusTaskId);
  }, [focusTaskId, onFocusTaskHandled, tasks]);

  if (!tasks.length) {
    return <p className="py-4 text-sm text-muted-foreground">{props.emptyMessage}</p>;
  }

  return tasks.map((task, index) => {
    const canAttest =
      task.taskType !== 'follow_up' &&
      task.taskType !== 'automated_check' &&
      task.status !== 'completed' &&
      task.status !== 'exception';

    const isBlockedAutomatedCheck =
      task.taskType === 'automated_check' && task.status === 'blocked';

    return (
      <div
        key={`review-task-${task.id}-${index}`}
        id={getReviewTaskElementId(task.id)}
        tabIndex={-1}
        className="space-y-3 rounded-lg border p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{task.title}</p>
              <Badge variant={getReviewTaskBadgeVariant(task)}>
                {getReviewTaskStatusLabel(task)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {task.policy || task.vendor || task.findingsSummary || isBlockedAutomatedCheck ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => props.onViewTaskSource(task)}
              >
                View
              </Button>
            ) : task.evidenceLinks.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => props.onViewEvidenceLink(task.evidenceLinks[0])}
              >
                View
              </Button>
            ) : null}
            {isBlockedAutomatedCheck ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={props.busyReviewRunAction !== null}
                onClick={() => void props.handleRecheckTask(task)}
              >
                {props.busyReviewRunAction === 'refresh' ? 'Rechecking...' : 'Recheck now'}
              </Button>
            ) : null}
            {canAttest ? (
              <Button
                type="button"
                size="sm"
                disabled={props.busyReviewTaskAction !== null}
                onClick={() => void props.handleAttestTask(task)}
              >
                {props.busyReviewTaskAction === `${task.id}:attest`
                  ? 'Saving\u2026'
                  : task.taskType === 'document_upload'
                    ? 'Upload'
                    : 'Attest'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  });
}

function getReviewTaskElementId(taskId: string) {
  return `review-task-${taskId}`;
}

function formatTriggeredReviewType(triggerType: string | null) {
  if (!triggerType) {
    return 'Manual follow-up';
  }

  return triggerType
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
