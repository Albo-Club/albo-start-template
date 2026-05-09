/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminModelImports from "../adminModelImports.js";
import type * as agentChat from "../agentChat.js";
import type * as agentChatActions from "../agentChatActions.js";
import type * as audit from "../audit.js";
import type * as auditArchive from "../auditArchive.js";
import type * as auth from "../auth.js";
import type * as auth_access from "../auth/access.js";
import type * as auth_authorized from "../auth/authorized.js";
import type * as auth_errors from "../auth/errors.js";
import type * as authLockout from "../authLockout.js";
import type * as brandTheme from "../brandTheme.js";
import type * as chatBackground from "../chatBackground.js";
import type * as chatModels from "../chatModels.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as dashboardStats from "../dashboardStats.js";
import type * as documentParseResults from "../documentParseResults.js";
import type * as e2e from "../e2e.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as emails from "../emails.js";
import type * as fileAccessTickets from "../fileAccessTickets.js";
import type * as fileServeHttp from "../fileServeHttp.js";
import type * as fileServing from "../fileServing.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as lib_agentChat from "../lib/agentChat.js";
import type * as lib_auditArchiveS3 from "../lib/auditArchiveS3.js";
import type * as lib_auditEmitters from "../lib/auditEmitters.js";
import type * as lib_authAudit from "../lib/authAudit.js";
import type * as lib_authRateLimits from "../lib/authRateLimits.js";
import type * as lib_betterAuth from "../lib/betterAuth.js";
import type * as lib_betterAuthEmailServices from "../lib/betterAuthEmailServices.js";
import type * as lib_chatAgentRuntime from "../lib/chatAgentRuntime.js";
import type * as lib_chatAttachments from "../lib/chatAttachments.js";
import type * as lib_chatRateLimits from "../lib/chatRateLimits.js";
import type * as lib_enterpriseAccess from "../lib/enterpriseAccess.js";
import type * as lib_fileAccessRateLimits from "../lib/fileAccessRateLimits.js";
import type * as lib_onboardingState from "../lib/onboardingState.js";
import type * as lib_organizationAuditProjection from "../lib/organizationAuditProjection.js";
import type * as lib_organizationCleanup from "../lib/organizationCleanup.js";
import type * as lib_organizationMembershipState from "../lib/organizationMembershipState.js";
import type * as lib_organizationPermissions from "../lib/organizationPermissions.js";
import type * as lib_requestAuditContext from "../lib/requestAuditContext.js";
import type * as lib_retention from "../lib/retention.js";
import type * as lib_returnValidators from "../lib/returnValidators.js";
import type * as lib_security_control_workspace_core from "../lib/security/control_workspace_core.js";
import type * as lib_security_core from "../lib/security/core.js";
import type * as lib_security_governance_context from "../lib/security/governance_context.js";
import type * as lib_security_operations_core from "../lib/security/operations_core.js";
import type * as lib_security_policies_core from "../lib/security/policies_core.js";
import type * as lib_security_posture from "../lib/security/posture.js";
import type * as lib_security_reports from "../lib/security/reports.js";
import type * as lib_security_review_runs_core from "../lib/security/review_runs_core.js";
import type * as lib_security_review_runs_migrations from "../lib/security/review_runs_migrations.js";
import type * as lib_security_review_runs_read_models from "../lib/security/review_runs_read_models.js";
import type * as lib_security_review_runs_task_sync from "../lib/security/review_runs_task_sync.js";
import type * as lib_security_securityEvidenceActivity from "../lib/security/securityEvidenceActivity.js";
import type * as lib_security_securityReviewConfig from "../lib/security/securityReviewConfig.js";
import type * as lib_security_securityWorkspaceOverview from "../lib/security/securityWorkspaceOverview.js";
import type * as lib_security_validators from "../lib/security/validators.js";
import type * as lib_security_vendors_core from "../lib/security/vendors_core.js";
import type * as lib_security_workspace from "../lib/security/workspace.js";
import type * as lib_storageBrokerClient from "../lib/storageBrokerClient.js";
import type * as lib_storageS3 from "../lib/storageS3.js";
import type * as lib_storageS3Control from "../lib/storageS3Control.js";
import type * as lib_vendorAudit from "../lib/vendorAudit.js";
import type * as organizationDomains from "../organizationDomains.js";
import type * as organizationManagement from "../organizationManagement.js";
import type * as passwordHistory from "../passwordHistory.js";
import type * as pdfParse from "../pdfParse.js";
import type * as pdfParseActions from "../pdfParseActions.js";
import type * as playground from "../playground.js";
import type * as playgroundAdmin from "../playgroundAdmin.js";
import type * as retention from "../retention.js";
import type * as scimLifecycle from "../scimLifecycle.js";
import type * as securityOps from "../securityOps.js";
import type * as securityPolicies from "../securityPolicies.js";
import type * as securityPoliciesNode from "../securityPoliciesNode.js";
import type * as securityPosture from "../securityPosture.js";
import type * as securityReports from "../securityReports.js";
import type * as securityReviews from "../securityReviews.js";
import type * as securityWorkspace from "../securityWorkspace.js";
import type * as seed_index from "../seed/index.js";
import type * as stepUp from "../stepUp.js";
import type * as storageCleanup from "../storageCleanup.js";
import type * as storageCleanupData from "../storageCleanupData.js";
import type * as storageDecision from "../storageDecision.js";
import type * as storageLifecycle from "../storageLifecycle.js";
import type * as storagePlatform from "../storagePlatform.js";
import type * as storageReadiness from "../storageReadiness.js";
import type * as storageS3Mirror from "../storageS3Mirror.js";
import type * as storageS3Primary from "../storageS3Primary.js";
import type * as storageTypes from "../storageTypes.js";
import type * as storageWebhook from "../storageWebhook.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminModelImports: typeof adminModelImports;
  agentChat: typeof agentChat;
  agentChatActions: typeof agentChatActions;
  audit: typeof audit;
  auditArchive: typeof auditArchive;
  auth: typeof auth;
  "auth/access": typeof auth_access;
  "auth/authorized": typeof auth_authorized;
  "auth/errors": typeof auth_errors;
  authLockout: typeof authLockout;
  brandTheme: typeof brandTheme;
  chatBackground: typeof chatBackground;
  chatModels: typeof chatModels;
  crons: typeof crons;
  dashboard: typeof dashboard;
  dashboardStats: typeof dashboardStats;
  documentParseResults: typeof documentParseResults;
  e2e: typeof e2e;
  emailTemplates: typeof emailTemplates;
  emails: typeof emails;
  fileAccessTickets: typeof fileAccessTickets;
  fileServeHttp: typeof fileServeHttp;
  fileServing: typeof fileServing;
  health: typeof health;
  http: typeof http;
  "lib/agentChat": typeof lib_agentChat;
  "lib/auditArchiveS3": typeof lib_auditArchiveS3;
  "lib/auditEmitters": typeof lib_auditEmitters;
  "lib/authAudit": typeof lib_authAudit;
  "lib/authRateLimits": typeof lib_authRateLimits;
  "lib/betterAuth": typeof lib_betterAuth;
  "lib/betterAuthEmailServices": typeof lib_betterAuthEmailServices;
  "lib/chatAgentRuntime": typeof lib_chatAgentRuntime;
  "lib/chatAttachments": typeof lib_chatAttachments;
  "lib/chatRateLimits": typeof lib_chatRateLimits;
  "lib/enterpriseAccess": typeof lib_enterpriseAccess;
  "lib/fileAccessRateLimits": typeof lib_fileAccessRateLimits;
  "lib/onboardingState": typeof lib_onboardingState;
  "lib/organizationAuditProjection": typeof lib_organizationAuditProjection;
  "lib/organizationCleanup": typeof lib_organizationCleanup;
  "lib/organizationMembershipState": typeof lib_organizationMembershipState;
  "lib/organizationPermissions": typeof lib_organizationPermissions;
  "lib/requestAuditContext": typeof lib_requestAuditContext;
  "lib/retention": typeof lib_retention;
  "lib/returnValidators": typeof lib_returnValidators;
  "lib/security/control_workspace_core": typeof lib_security_control_workspace_core;
  "lib/security/core": typeof lib_security_core;
  "lib/security/governance_context": typeof lib_security_governance_context;
  "lib/security/operations_core": typeof lib_security_operations_core;
  "lib/security/policies_core": typeof lib_security_policies_core;
  "lib/security/posture": typeof lib_security_posture;
  "lib/security/reports": typeof lib_security_reports;
  "lib/security/review_runs_core": typeof lib_security_review_runs_core;
  "lib/security/review_runs_migrations": typeof lib_security_review_runs_migrations;
  "lib/security/review_runs_read_models": typeof lib_security_review_runs_read_models;
  "lib/security/review_runs_task_sync": typeof lib_security_review_runs_task_sync;
  "lib/security/securityEvidenceActivity": typeof lib_security_securityEvidenceActivity;
  "lib/security/securityReviewConfig": typeof lib_security_securityReviewConfig;
  "lib/security/securityWorkspaceOverview": typeof lib_security_securityWorkspaceOverview;
  "lib/security/validators": typeof lib_security_validators;
  "lib/security/vendors_core": typeof lib_security_vendors_core;
  "lib/security/workspace": typeof lib_security_workspace;
  "lib/storageBrokerClient": typeof lib_storageBrokerClient;
  "lib/storageS3": typeof lib_storageS3;
  "lib/storageS3Control": typeof lib_storageS3Control;
  "lib/vendorAudit": typeof lib_vendorAudit;
  organizationDomains: typeof organizationDomains;
  organizationManagement: typeof organizationManagement;
  passwordHistory: typeof passwordHistory;
  pdfParse: typeof pdfParse;
  pdfParseActions: typeof pdfParseActions;
  playground: typeof playground;
  playgroundAdmin: typeof playgroundAdmin;
  retention: typeof retention;
  scimLifecycle: typeof scimLifecycle;
  securityOps: typeof securityOps;
  securityPolicies: typeof securityPolicies;
  securityPoliciesNode: typeof securityPoliciesNode;
  securityPosture: typeof securityPosture;
  securityReports: typeof securityReports;
  securityReviews: typeof securityReviews;
  securityWorkspace: typeof securityWorkspace;
  "seed/index": typeof seed_index;
  stepUp: typeof stepUp;
  storageCleanup: typeof storageCleanup;
  storageCleanupData: typeof storageCleanupData;
  storageDecision: typeof storageDecision;
  storageLifecycle: typeof storageLifecycle;
  storagePlatform: typeof storagePlatform;
  storageReadiness: typeof storageReadiness;
  storageS3Mirror: typeof storageS3Mirror;
  storageS3Primary: typeof storageS3Primary;
  storageTypes: typeof storageTypes;
  storageWebhook: typeof storageWebhook;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
