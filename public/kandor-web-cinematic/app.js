const state = {
  selectedCandidateIndex: 0,
  selectedPersistedIndex: 0,
  selectedKind: "candidate",
  queue: {
    candidatePriority: "all",
    candidateSort: "rank",
    persistedStatus: "all",
    persistedSort: "newest",
    abstentionFilter: "all"
  },
  reviewHistory: {
    kind: "all",
    signalTier: "all",
    reviewPriority: "all",
    abstentionReason: "all",
    direction: "all",
    confidenceBucket: "all",
    source: "all",
    anomalySeverity: "all"
  },
  data: null
};

const ALLOWED_MANUAL_OUTCOMES = ["WON", "LOST", "BREAKEVEN", "CANCELLED", "OPEN"];

const endpoints = {
  health: "/health",
  readiness: "/api/live-readiness",
  candidates: "/api/proposals/candidates?limit=20",
  evidence: "/api/evidence/events?limit=80",
  queryProposals: "/api/query/proposals?limit=30",
  queryStatus: "/api/query/status",
  queryFeedHealth: "/api/query/feed-health?limit=12",
  reviewIntelligence: "/api/query/review-intelligence?limit=100",
  replayLabels: "/api/replay/labels",
  replayCompare: "/api/replay/compare",
  replaySplits: "/api/replay/splits",
  autonomyStatus: "/api/autonomy/status",
  autonomyPromotion: "/api/autonomy/promotion",
  paperPositions: "/api/paper/positions",
  positionSizing: "/api/trading/position-sizing?equityUsd=10000&riskBudgetPct=1&entryPrice=100&stopPrice=97&leverage=2&maxNotionalPctOfEquity=50",
  learningStatus: "/api/learning/status",
  learningLatest: "/api/learning/latest",
  learningComparison: "/api/learning/comparison",
  learningPromotion: "/api/learning/promotion",
  feedHealth: "/api/feed-health",
  feedDiagnostics: "/api/market/feed-diagnostics?timeoutMs=2500",
  publicContext: "/api/market/public-context",
  regime: "/api/market/regime",
  observer: "/api/observer/summary",
  observerDiagnostics: "/api/observer/diagnostics",
  killSwitches: "/api/risk/kill-switches",
  exitPolicy: "/api/exit/policy-report",
  manualCloseWorkflow: "/api/exit/manual-close-workflow?limit=12",
  venueStatus: "/api/venue-status",
  venueReliability: "/api/venues/reliability",
  reconciliation: "/api/reconciliation",
  tcaSummary: "/api/tca/summary",
  lifecycleSummary: "/api/positions/lifecycle",
  metrics: "/api/replay/metrics",
  replayRun: "/api/replay/run?candidateLimit=50",
  memoryStatus: "/api/memory/status",
  memoryRetrieval: "/api/memory/retrieval?query=replay%20learning%20risk%20review&limit=3",
  memoryCoverage: "/api/memory/coverage",
  handoffSummary: "/api/memory/handoff",
  thinkingSummary: "/api/memory/thinking",
  analysisStatus: "/api/analysis/status"
};

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function formatPct(value) {
  return value === null || value === undefined ? "--" : `${formatNumber(value * 100, 1)}%`;
}

function formatDurationCompact(start, end) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return "unavailable";
  }

  const totalMinutes = Math.round((endMs - startMs) / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function tone(value) {
  const normalized = String(value || "").toLowerCase();
  if (["healthy", "implemented", "ok", "operational", "review", "accepted"].includes(normalized)) return "good";
  if (["partial", "warn", "degraded", "maintenance", "open", "hold", "mismatch"].includes(normalized)) return "warn";
  if (["missing", "tripped", "halted", "rejected", "deny", "lost", "blocked"].includes(normalized)) return "bad";
  return "";
}

async function getJson(path) {
  const response = await fetch(path);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `${path} ${response.status}`);
  }
  return payload;
}

async function getOptionalJson(path) {
  try {
    return await getJson(path);
  } catch {
    return {
      ok: false,
      error: "analysis_status_unavailable"
    };
  }
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function item({ title, detail, badge, status = "", active = false, index = null, surface = "" }) {
  const selectable = index !== null;
  const selectLabel = selectable ? `Select ${title}: ${detail}` : "";
  const indexAttr = selectable
    ? ` data-index="${index}" role="button" tabindex="0" aria-label="${escapeHtml(selectLabel)}"`
    : "";
  const surfaceClass = surface ? ` item-surface-${surface}` : "";
  return `
    <article class="item ${active ? "active" : ""}${surfaceClass}"${indexAttr}>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
      <span class="tag status-chip ${tone(status || badge)}">${escapeHtml(badge)}</span>
    </article>
  `;
}

function bindSelectableItems(containerId, onSelect) {
  byId(containerId).querySelectorAll("[data-index]").forEach((node) => {
    const activate = () => onSelect(Number(node.dataset.index));
    node.addEventListener("click", activate);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function barRow({ title, detail, value, total, status = "" }) {
  const numericValue = Number(value) || 0;
  const numericTotal = Math.max(Number(total) || 0, numericValue, 1);
  const percent = Math.max(0, Math.min(100, (numericValue / numericTotal) * 100));

  return `
    <article class="bar-row ${tone(status)}">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
      <span class="tag status-chip ${tone(status)}">${escapeHtml(numericValue)}</span>
      <div class="bar-track" aria-hidden="true">
        <span class="bar-fill" style="width: ${percent.toFixed(1)}%"></span>
      </div>
    </article>
  `;
}

function metricDisplay({ label, value, status = "" }) {
  const safeValue = escapeHtml(value);
  return `
    <article class="metric-display digital-counter ${tone(status)}">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value" data-value="${safeValue}"><span>${safeValue}</span></strong>
    </article>
  `;
}

function authorityFlags(flags) {
  return `
    <article class="authority-flags-container" aria-label="Authority flags">
      ${flags.map((flag) => `<span class="flag-mini">${escapeHtml(flag)}</span>`).join("")}
    </article>
  `;
}

function diagnosticsReport() {
  return state.data.feedDiagnostics?.diagnostics || null;
}

function diagnosticsStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "healthy") return "market feeds reachable";
  if (normalized === "provider_blocked") return "provider DNS policy";
  if (normalized === "resolver_unavailable") return "resolver unavailable";
  return normalized || "unavailable";
}

function diagnosticsStatusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "healthy") return "ok";
  if (normalized === "provider_blocked" || normalized === "resolver_unavailable") return "warn";
  return normalized ? "hold" : "missing";
}

function diagnosticsNarrative(report) {
  if (!report) {
    return {
      title: "Provider diagnostics unavailable",
      detail: "No read-only provider reachability probe is loaded.",
      badge: "missing",
      status: "missing"
    };
  }

  if (report.overallStatus === "healthy") {
    return {
      title: "Provider diagnostics",
      detail: `${report.reachableMarketFeedCount || 0}/${report.marketFeedCount || 0} market-feed probes reachable · advisory only`,
      badge: diagnosticsStatusLabel(report.overallStatus),
      status: diagnosticsStatusTone(report.overallStatus)
    };
  }

  if (report.overallStatus === "provider_blocked") {
    return {
      title: "Provider diagnostics",
      detail: "Control HTTPS is reachable, but upstream DNS/RPZ policy is blocking public market-feed domains. This is outside Kandor code and remains advisory-only.",
      badge: diagnosticsStatusLabel(report.overallStatus),
      status: diagnosticsStatusTone(report.overallStatus)
    };
  }

  if (report.overallStatus === "resolver_unavailable") {
    return {
      title: "Provider diagnostics",
      detail: "The local DNS resolver cannot resolve the control probe or market-feed domains. Restore networking first; Kandor does not bypass this boundary.",
      badge: diagnosticsStatusLabel(report.overallStatus),
      status: diagnosticsStatusTone(report.overallStatus)
    };
  }

  return {
    title: "Provider diagnostics",
    detail: report.summary || "Read-only provider reachability probe returned a non-healthy state.",
    badge: diagnosticsStatusLabel(report.overallStatus),
    status: diagnosticsStatusTone(report.overallStatus)
  };
}

function briefCard({ label, title, detail, badge, status = "" }) {
  return `
    <article class="brief-card ${tone(status || badge)}">
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(detail)}</p>
      </div>
      <span class="tag status-chip ${tone(status || badge)}">${escapeHtml(badge)}</span>
    </article>
  `;
}

function renderMetrics() {
  const readiness = state.data.readiness.liveReadiness;
  const candidates = state.data.candidates;
  const metrics = state.data.metrics.metrics;
  const regime = state.data.regime.regime;
  const tca = metrics.tcaMetrics;
  const proposal = metrics.proposalMetrics;

  byId("metric-strip").innerHTML = [
    metricDisplay({
      label: "Live",
      value: readiness.liveExecutionAllowed ? "REVIEW" : "BLOCKED",
      status: readiness.liveExecutionAllowed ? "warn" : "blocked"
    }),
    metricDisplay({
      label: "Regime",
      value: String(regime.state || "UNKNOWN").toUpperCase(),
      status: regime.state === "STRESS" ? "warn" : "neutral"
    }),
    metricDisplay({
      label: "Candidates",
      value: candidates.totals.candidates,
      status: candidates.totals.candidates > 0 ? "warn" : "neutral"
    }),
    metricDisplay({
      label: "Abstain",
      value: formatPct(proposal.abstentionRate),
      status: proposal.abstentionRate > 0.5 ? "warn" : "neutral"
    }),
    metricDisplay({
      label: "Precision",
      value: formatPct(proposal.precision),
      status: proposal.precision >= 0.6 ? "ok" : "neutral"
    }),
    metricDisplay({
      label: "TCA Reject",
      value: formatPct(tca.rejectLikeRate),
      status: tca.rejectLikeRate > 0 ? "warn" : "neutral"
    }),
    metricDisplay({
      label: "Slippage",
      value: formatNumber(tca.averageSlippageBps, 2),
      status: "neutral"
    })
  ].join("");
}

function renderStateBrief() {
  const readiness = state.data.readiness.liveReadiness;
  const feed = state.data.feedHealth.feedHealth;
  const regime = state.data.regime.regime;
  const candidates = state.data.candidates;
  const proposalMetrics = state.data.metrics.metrics.proposalMetrics;
  const blockers = readiness.blockingReasons || [];
  const anomaly = candidates.intelligence?.anomalySummary || {};

  byId("state-brief").innerHTML = [
    briefCard({
      label: "Execution Boundary",
      title: readiness.liveExecutionAllowed ? "Review Required" : "Live Blocked",
      detail: blockers.length ? blockers.slice(0, 3).join(", ") : "Live authority absent by policy.",
      badge: readiness.liveExecutionAllowed ? "review" : "blocked",
      status: readiness.liveExecutionAllowed ? "blocked" : "ok"
    }),
    briefCard({
      label: "Regime Banner",
      title: regime.state || "UNKNOWN",
      detail: `${regime.trend || "unknown"} · volatility ${regime.volatility?.bucket || "UNKNOWN"} · funding ${regime.funding?.bucket || "UNKNOWN"}`,
      badge: regime.calibration?.status || "uncalibrated",
      status: regime.state === "STRESS" ? "warn" : "ok"
    }),
    briefCard({
      label: "Queue Triage",
      title: `${candidates.totals.candidates} candidates`,
      detail: `${candidates.totals.abstentions} abstentions · anomaly ${anomaly.highestSeverity || "none"} · precision ${formatPct(proposalMetrics.precision)}`,
      badge: anomaly.highestSeverity || "none",
      status: anomaly.highestSeverity === "critical" ? "blocked" : anomaly.highestSeverity === "warning" ? "warn" : "ok"
    })
  ].join("");
}

function renderDashboardList(id, rows) {
  const node = byId(id);
  if (node) {
    node.innerHTML = rows.join("");
  }
}

function latestByTimestamp(rows = [], field = "observedAt") {
  return rows
    .filter(Boolean)
    .slice()
    .sort((left, right) => String(right[field] || "").localeCompare(String(left[field] || "")))[0] || null;
}

function ruleResult(report = {}, ruleName) {
  return (report.ruleResults || []).find((row) => row.rule === ruleName) || null;
}

function dashboardEndpointStatus(report = {}, providerPattern) {
  const endpoint = (report.endpoints || []).find((row) => (
    String(row.provider || row.endpointId || "").toLowerCase().includes(providerPattern)
  ));
  if (!endpoint) {
    return item({
      title: `${providerPattern} reachability`,
      detail: "No read-only endpoint probe reported for this provider.",
      badge: "missing",
      status: "missing"
    });
  }
  return item({
    title: `${endpoint.provider || endpoint.endpointId} reachability`,
    detail: `${endpoint.endpointId || "endpoint"} · DNS ${endpoint.dnsStatus || endpoint.status || "unknown"} · HTTP ${endpoint.httpStatus ?? endpoint.status ?? "unknown"}`,
    badge: endpoint.status || "unknown",
    status: endpoint.status || "unknown"
  });
}

function renderDashboardSections() {
  const health = state.data.health || {};
  const readiness = state.data.readiness?.liveReadiness || {};
  const analysis = state.data.analysisStatus || {};
  const registry = analysis.registry || {};
  const barrier = analysis.implementationBarrier || {};
  const riskIntegrity = analysis.riskGateIntegrity || {};
  const analysisSummary = analysis.summary || {};
  const query = state.data.queryStatus?.queryIndex || {};
  const queryReadiness = query.readiness || {};
  const diagnostics = diagnosticsReport() || {};
  const candidates = state.data.candidates || {};
  const candidateRows = candidates.candidates || [];
  const proposalRecords = state.data.queryProposals?.proposals?.proposals || [];
  const selected = selectedProposal();
  const selectedRisk = selected?.risk || {};
  const selectedProposalData = selected?.proposal || {};
  const evidenceRows = state.data.evidence?.events || [];
  const latestEvidence = latestByTimestamp(evidenceRows) || {};
  const feedHealth = state.data.feedHealth?.feedHealth || {};
  const feedSnapshots = state.data.queryFeedHealth?.feedHealth?.snapshots || [];
  const latestSnapshot = latestByTimestamp(feedSnapshots, "latestObservedAt") || latestByTimestamp(feedSnapshots, "checkedAt") || {};
  const metrics = state.data.metrics?.metrics || {};
  const proposalMetrics = metrics.proposalMetrics || {};
  const candidateMetrics = metrics.candidateMetrics || {};
  const labelMetrics = metrics.replayLabelMetrics || {};
  const calibration = proposalMetrics.calibration || {};
  const tcaMetrics = metrics.tcaMetrics || {};
  const comparison = state.data.replayCompare?.comparison || null;
  const comparisonDelta = comparison?.delta || {};
  const replayRun = state.data.replayRun?.replayRun || {};
  const learningStatus = state.data.learningStatus?.learning || {};
  const latestLearning = state.data.learningLatest?.latest || {};
  const learningComparison = latestLearningComparison();
  const learningPromotion = latestLearningPromotion();
  const replaySplits = state.data.replaySplits?.split || replayRun.regimeSplits || {};
  const exitPayload = state.data.exitPolicy || {};
  const exitReport = exitPayload.report || {};
  const paper = state.data.paperPositions?.paper || {};
  const lifecyclePayload = state.data.lifecycleSummary || {};
  const lifecycle = lifecyclePayload.lifecycle || {};
  const manualClose = health.manualCloseWorkflow || {};
  const readinessGuidance = readiness.guidance || {};
  const controlGaps = readiness.controlGaps || {};
  const venueStatus = state.data.venueStatus?.venueStatus || {};
  const venueReliability = state.data.venueReliability?.reliability || {};
  const killSwitches = state.data.killSwitches?.killSwitches || {};
  const killControls = killSwitches.controls || [];
  const activeTrips = killControls.filter((control) => String(control.current?.status || "").toLowerCase() === "tripped");
  const tcaPayload = state.data.tcaSummary || {};
  const tcaSummary = tcaPayload.tca || {};
  const reconciliation = state.data.reconciliation?.reconciliation || {};
  const implementedControls = (readiness.controls || []).filter((control) => control.status === "implemented");
  const reportSchemas = [
    "code_semantics_report_v1",
    "algorithm_equivalence_report_v1",
    "risk_gate_integrity_report_v1",
    "candidate_patch_report_v1",
    "replay_impact_report_v1",
    "implementation_barrier_report_v1",
    "analysis_registry_report_v1",
    "analysis_status_v1",
    "before_after_replay_comparison_v1",
    "exit_policy_report_v1"
  ];
  const stopLoss = ruleResult(exitReport, "stopLoss");
  const takeProfit = ruleResult(exitReport, "takeProfit");
  const timeout = ruleResult(exitReport, "timeout");
  const regimeFlip = ruleResult(exitReport, "regimeFlip");
  const liquidationDistance = exitReport.researchSignals?.liquidationDistance || {};
  const fundingExposure = exitReport.researchSignals?.fundingExposure || {};
  const selectedReviewFocus = selected
    ? selectedRisk.reviewEligible
      ? {
        detail: "Review required: inspect evidence, risk gate, replay, and exit-policy context before any outside workflow.",
        badge: "review required",
        status: "review"
      }
      : {
        detail: "Blocked by policy or gate: keep this as an advisory record until the listed gate reason is resolved outside this dashboard.",
        badge: "blocked by policy",
        status: "blocked"
      }
    : {
      detail: "Select a candidate or indexed proposal in Queue. Keyboard: Tab to a row, then Enter or Space to select.",
      badge: "empty",
      status: "missing"
    };

  renderDashboardList("dashboard-boundary-list", [
    item({
      title: "Review shell only",
      detail: "Read-only/advisory-only/manual-review-first dashboard; no orders, key-management forms, lifecycle mutation, deployment, or policy override controls.",
      badge: "safe",
      status: "ok"
    }),
    authorityFlags(["read-only", "advisory-only", "no live", "no patch"]),
    item({
      title: "Status language",
      detail: "Healthy means current evidence is usable; Review required means a human assessment is needed; Blocked by policy means runtime authority is absent.",
      badge: "legend",
      status: "ok"
    }),
    item({
      title: "Authority boundary",
      detail: `liveExecutionEnabled ${String(health.liveExecutionEnabled)} · canPlaceOrders ${String(readiness.canPlaceOrders)} · change authority ${String(analysisSummary.patchAuthorityAbsent ? "absent" : "review")}`,
      badge: readiness.liveExecutionAllowed ? "blocked" : "advisory-only",
      status: readiness.liveExecutionAllowed ? "blocked" : "ok"
    }),
    item({
      title: "Manual review contract",
      detail: "Proposal, evidence, replay, exit, paper, feed, kill-switch, TCA, and reconciliation surfaces are observational.",
      badge: "evidence-backed",
      status: "ok"
    })
  ]);

  renderDashboardList("dashboard-system-status", [
    item({ title: "/health", detail: `liveExecutionEnabled ${String(health.liveExecutionEnabled)}`, badge: health.liveExecutionEnabled === false ? "false" : "review", status: health.liveExecutionEnabled === false ? "ok" : "blocked" }),
    item({ title: "Analysis control plane", detail: `passed ${String(analysisSummary.analysisControlPlanePassed)}`, badge: analysisSummary.analysisControlPlanePassed ? "passed" : "review", status: analysisSummary.analysisControlPlanePassed ? "ok" : "warn" }),
    item({ title: "Registry", detail: `${registry.toolCount ?? 0} tools · missing ${(registry.missingTools || []).length}`, badge: registry.status || "unknown", status: registry.status || "unknown" }),
    item({ title: "Implementation barrier", detail: `advisoryOnly ${String(barrier.advisoryOnly)} · canApplyPatch ${String(barrier.canApplyPatch)}`, badge: barrier.status || "unknown", status: barrier.status || "unknown" }),
    item({ title: "Risk-gate integrity", detail: `signedRequestsAbsent ${String(riskIntegrity.signedRequestsAbsent)} · executionRoutesAbsent ${String(riskIntegrity.executionRoutesAbsent)}`, badge: riskIntegrity.status || "unknown", status: riskIntegrity.status || "unknown" }),
    item({ title: "Verify guidance", detail: compactList(analysis.recommendedVerificationCommands || [], "No verification guidance loaded."), badge: "local", status: "ok" }),
    item({
      title: "Indexed query readiness",
      detail: `${query.sourceOfTruth || "unknown"} · ${query.persistence || "unknown"} · stored query index state; REVIEW is an indexed-evidence review marker, not a current network failure.`,
      badge: queryReadiness.status || "unknown",
      status: queryReadiness.status || "unknown",
      surface: "indexed-state"
    }),
    item({
      title: "Current market diagnostics",
      detail: `Current runtime network/provider probe; independent from indexed feed-health evidence. ${diagnostics.summary || "No read-only diagnostics loaded."}`,
      badge: diagnostics.overallStatus || "missing",
      status: diagnosticsStatusTone(diagnostics.overallStatus),
      surface: "current-diagnostics"
    })
  ]);

  renderDashboardList("dashboard-analysis-plane", [
    item({ title: "Implemented report schemas", detail: reportSchemas.join(", "), badge: reportSchemas.length, status: "ok" }),
    item({ title: "Tool count", detail: `${registry.toolCount ?? 0} registered analysis tools`, badge: registry.toolCount ?? 0, status: registry.status || "unknown" }),
    item({ title: "Missing tools", detail: compactList(registry.missingTools || [], "none"), badge: (registry.missingTools || []).length, status: (registry.missingTools || []).length ? "warn" : "ok" }),
    item({ title: "Advisory-only flags", detail: `allToolsReadOnly ${String(analysisSummary.allToolsReadOnly)} · allToolsAdvisoryOnly ${String(analysisSummary.allToolsAdvisoryOnly)}`, badge: analysisSummary.allToolsAdvisoryOnly ? "yes" : "review", status: analysisSummary.allToolsAdvisoryOnly ? "ok" : "blocked" }),
    item({ title: "Patch authority absent", detail: `canGeneratePatch ${String(barrier.canGeneratePatch)} · canApplyPatch ${String(barrier.canApplyPatch)}`, badge: analysisSummary.patchAuthorityAbsent ? "absent" : "review", status: analysisSummary.patchAuthorityAbsent ? "ok" : "blocked" }),
    item({ title: "Live authority absent", detail: `canAuthorizeLiveExecution ${String(barrier.canAuthorizeLiveExecution)} · liveExecutionBlocked ${String(riskIntegrity.liveExecutionBlocked)}`, badge: analysisSummary.liveAuthorityAbsent ? "absent" : "review", status: analysisSummary.liveAuthorityAbsent ? "ok" : "blocked" }),
    item({ title: "Implementation barrier status", detail: "Analysis may recommend and explain only.", badge: barrier.status || "unknown", status: barrier.status || "unknown" }),
    item({ title: "Analysis registry status", detail: `schema ${analysis.schema || "analysis_status_v1"}`, badge: registry.status || "unknown", status: registry.status || "unknown" })
  ]);

  renderDashboardList("dashboard-proposal-desk", [
    item({ title: "Proposal queue", detail: `${candidateRows.length} generated candidates · ${proposalRecords.length} indexed proposals`, badge: candidateRows.length + proposalRecords.length, status: candidateRows.length || proposalRecords.length ? "review" : "missing" }),
    item({ title: "Human review focus", detail: selectedReviewFocus.detail, badge: selectedReviewFocus.badge, status: selectedReviewFocus.status }),
    item({ title: "Proposal detail", detail: selectedProposalData.proposalId || "No proposal selected.", badge: selected?.kind || "empty", status: selected ? "review" : "missing" }),
    item({ title: "Symbol / venue / side", detail: `${selectedProposalData.symbol || "--"} · ${selectedProposalData.venue || "--"} · ${selectedProposalData.side || "--"}`, badge: formatPct(selectedProposalData.confidence), status: selected ? "ok" : "missing" }),
    item({ title: "Requested action", detail: selectedProposalData.requestedAction || "review-only/no requested action", badge: selectedProposalData.requestedAction || "none", status: selectedProposalData.requestedAction ? "review" : "ok" }),
    item({ title: "Risk gate result", detail: selectedRisk.reason || "risk gate unavailable", badge: selectedRisk.decision || "missing", status: selectedRisk.decision || "missing" }),
    item({ title: "Evidence IDs", detail: compactList((selectedProposalData.evidenceIds || []).slice(0, 8), "No evidence ids attached."), badge: (selectedProposalData.evidenceIds || []).length, status: (selectedProposalData.evidenceIds || []).length ? "ok" : "missing" }),
    item({ title: "Abstentions", detail: formatCounts(candidates.intelligence?.abstentionReasonCounts || {}) || `${candidates.totals?.abstentions || 0} abstentions in candidate scan`, badge: candidates.totals?.abstentions || 0, status: candidates.totals?.abstentions ? "hold" : "ok" }),
    item({ title: "Deny reasons / review status", detail: compactList(selectedRisk.errors || [], selectedRisk.reviewEligible ? "Review eligible; no deny reason in selected risk gate." : selectedRisk.reason || "No selection."), badge: selectedRisk.reviewEligible ? "review" : "held", status: selectedRisk.reviewEligible ? "review" : "hold" })
  ]);

  renderDashboardList("dashboard-evidence-viewer", [
    item({ title: "Evidence IDs", detail: compactList(evidenceRows.slice(-5).map((event) => event.eventId), "No evidence events loaded; rebuild or ingest evidence outside this dashboard."), badge: evidenceRows.length, status: evidenceRows.length ? "ok" : "missing" }),
    item({ title: "Event lineage", detail: latestEvidence.eventId ? `${latestEvidence.type || "event"} · ${latestEvidence.source || "unknown source"}` : "No latest evidence event; this panel stays empty until local evidence exists.", badge: latestEvidence.eventId || "missing", status: latestEvidence.eventId ? "ok" : "missing" }),
    item({ title: "parentIds", detail: compactList(latestEvidence.parentIds || [], "No parent ids on latest loaded event."), badge: (latestEvidence.parentIds || []).length, status: (latestEvidence.parentIds || []).length ? "ok" : "missing" }),
    item({ title: "Payload hashes", detail: latestEvidence.payloadHash || latestEvidence.hash || latestEvidence.payload?.hash || "Payload hash unavailable in loaded evidence window.", badge: latestEvidence.payloadHash || latestEvidence.hash ? "hash" : "missing", status: latestEvidence.payloadHash || latestEvidence.hash ? "ok" : "missing" }),
    item({
      title: "Indexed feed-health evidence",
      detail: `Stored feed-health state: quality ${feedHealth.qualityStatus || "unknown"} · errors ${feedHealth.totals?.qualityErrors || 0} · warnings ${feedHealth.totals?.qualityWarnings || 0}. Degraded indexed state does not mean current diagnostics are failing.`,
      badge: feedHealth.overallStatus || "unknown",
      status: feedHealth.overallStatus || "unknown",
      surface: "indexed-feed"
    }),
    item({ title: "Observed / ingested", detail: `${latestEvidence.observedAt || "observedAt missing"} · ${latestEvidence.ingestedAt || latestEvidence.createdAt || "ingestedAt missing"}`, badge: "timestamps", status: latestEvidence.observedAt ? "ok" : "missing" }),
    item({ title: "Linked proposal IDs", detail: compactList([...new Set(evidenceRows.map((event) => event.payload?.proposalId).filter(Boolean))].slice(0, 8), "No linked proposal ids in loaded evidence."), badge: "lineage", status: "ok" })
  ]);

  renderDashboardList("dashboard-replay-desk", [
    item({ title: "Replay comparison workflow", detail: comparison?.comparisonHash || "No comparison hash loaded.", badge: comparison?.schema || "before_after_replay_comparison_v1", status: comparison ? "review" : "missing" }),
    item({ title: "replay_impact_report_v1", detail: `run ${replayRun.runHash || "missing"} · mode ${replayRun.mode || "unknown"}`, badge: replayRun.leakageChecks?.ok ? "causal" : "blocked", status: replayRun.leakageChecks?.ok ? "ok" : "blocked" }),
    item({ title: "Metric deltas", detail: `precision ${formatPct(comparisonDelta.precision)} · recall ${comparisonDelta.recall === null ? "insufficient" : formatPct(comparisonDelta.recall)} · falsePositiveRate ${formatPct(comparisonDelta.falsePositiveRate)} · abstentionRate ${formatPct(comparisonDelta.abstentionRate)} · brier ${formatNumber(comparisonDelta.brier, 3)} · ece ${formatPct(comparisonDelta.ece)}`, badge: comparison ? "comparison" : "missing", status: comparison ? "review" : "missing" }),
    item({ title: "Current replay metrics", detail: `precision ${formatPct(proposalMetrics.precision)} · recall ${labelMetrics.recall === null ? labelMetrics.recallReason || "insufficient" : formatPct(labelMetrics.recall)} · false positives ${formatPct(proposalMetrics.falsePositiveRate)} · abstention ${formatPct(proposalMetrics.abstentionRate)} · brier ${formatNumber(calibration.brierScore, 3)} · ece ${formatPct(calibration.expectedCalibrationError)}`, badge: calibration.status || "metrics", status: calibration.status === "insufficient_labels" ? "hold" : "ok" }),
    item({ title: "Label coverage", detail: `${labelMetrics.labelCount || 0} labels · explicit coverage ${formatPct(labelMetrics.coverage?.explicitCoverage)}`, badge: labelMetrics.labelCount || "none", status: labelMetrics.labelCount ? "ok" : "hold" }),
    item({ title: "Warnings / status", detail: `${replayRun.leakageChecks?.reason || "causal replay check"} · ${comparison?.mode || "comparison unavailable"}`, badge: replayRun.executionAuthority ? "blocked" : "advisory", status: replayRun.executionAuthority ? "blocked" : "ok" }),
    item({ title: "Commands", detail: "npm run analysis:compare-fixture · npm run analysis:export-replay", badge: "local", status: "ok" })
  ]);

  renderDashboardList("dashboard-learning-insights", [
    item({ title: "Learning profile summaries", detail: latestLearning.profile?.profileId || "No candidate profile recorded.", badge: latestLearning.profile?.status || "missing", status: latestLearning.profile ? "review" : "missing" }),
    item({ title: "Replay run summaries", detail: `${replayRun.candidateReplay?.candidateCount || 0} candidates · ${replayRun.candidateReplay?.abstentionCount || 0} abstentions`, badge: replayRun.mode || "replay", status: replayRun.executionAuthority ? "blocked" : "ok" }),
    item({ title: "Calibration notes", detail: `${calibration.labeledCount || 0} outcomes · Brier ${formatNumber(calibration.brierScore, 3)} · ECE ${formatPct(calibration.expectedCalibrationError)}`, badge: calibration.status || "unknown", status: calibration.status === "insufficient_labels" ? "hold" : "ok" }),
    item({ title: "Promotion reports", detail: learningPromotion ? `${learningPromotion.profileHash || "profile"} · ${(learningPromotion.reasons || []).join(", ") || "no reasons"}` : "No advisory promotion report recorded.", badge: learningPromotion?.recommendation || "missing", status: learningPromotion ? "review" : "missing" }),
    item({ title: "Paper-only reminder", detail: `learning mode ${learningStatus.mode || "unknown"} · live authority remains absent`, badge: learningStatus.executionAuthority ? "blocked" : "paper-only", status: learningStatus.executionAuthority ? "blocked" : "ok" }),
    item({ title: "Replay corpus status", detail: `${replaySplits.bucketCount || 0} regime buckets · validation coverage ${formatPct(replaySplits.summary?.validationCoveragePct)}`, badge: replaySplits.status || "unknown", status: replaySplits.status === "passed" ? "ok" : "hold" })
  ]);

  renderDashboardList("dashboard-exit-policy", exitPayload.ok === false ? [
    item({ title: "Exit policy report unavailable", detail: exitPayload.error || "exit_policy_report_unavailable", badge: "missing", status: "warn" })
  ] : [
    item({ title: "exit_policy_report_v1", detail: `${exitReport.symbol || "--"} · ${exitReport.venue || "--"} · ${exitReport.summary?.recommendation || "no recommendation"}`, badge: exitReport.conclusion?.status || "unknown", status: exitReport.summary?.anyTriggered ? "warn" : "ok" }),
    item({ title: "Stop-loss status", detail: stopLoss?.reason || "stop-loss rule not triggered in fixture.", badge: stopLoss?.triggered ? "triggered" : "clear", status: stopLoss?.triggered ? "blocked" : "ok" }),
    item({ title: "Take-profit stages", detail: takeProfit?.reason || "take-profit rule not triggered in fixture.", badge: takeProfit?.triggered ? "triggered" : "clear", status: takeProfit?.triggered ? "review" : "ok" }),
    item({ title: "Timeout status", detail: timeout?.reason || "timeout rule not triggered in fixture.", badge: timeout?.triggered ? "triggered" : "clear", status: timeout?.triggered ? "review" : "ok" }),
    item({ title: "Regime-flip warning", detail: regimeFlip?.reason || "regime-flip rule not triggered in fixture.", badge: regimeFlip?.triggered ? "triggered" : "clear", status: regimeFlip?.triggered ? "warn" : "ok" }),
    item({ title: "Liquidation-distance warning", detail: `${liquidationDistance.tier || "UNKNOWN"} · available ${String(liquidationDistance.available)}`, badge: liquidationDistance.tier || "unknown", status: liquidationDistance.tier === "CRITICAL" ? "blocked" : liquidationDistance.tier === "WARNING" ? "warn" : "ok" }),
    item({ title: "Funding-exposure warning", detail: `${fundingExposure.reason || "funding signal unavailable"} · available ${String(fundingExposure.available)}`, badge: fundingExposure.tier || "unknown", status: fundingExposure.triggered ? "warn" : "ok" }),
    item({ title: "Kill-switch review state", detail: `${activeTrips.length} active trips · highest severity ${exitReport.summary?.highestSeverity || "none"}`, badge: activeTrips.length ? "review" : "clear", status: activeTrips.length ? "blocked" : "ok" }),
    item({ title: "recommendedDisposition", detail: exitReport.summary?.recommendation || "NO_CLOSE_RECOMMENDED", badge: exitReport.advisoryOnly ? "advisoryOnly" : "review", status: exitReport.advisoryOnly ? "ok" : "blocked" }),
    item({ title: "canClosePosition false", detail: `canPlaceOrder false · canAuthorizeLiveExecution ${String(exitReport.canAuthorizeLiveExecution)}`, badge: "false", status: exitReport.executionAuthority === false ? "ok" : "blocked" })
  ]);

  renderDashboardList("dashboard-paper-portfolio", [
    item({ title: "Paper positions", detail: `${paper.openCount || 0} open · ${paper.closedCount || 0} closed · ${paper.paperFillCount || 0} simulated fills`, badge: "paper-only", status: paper.executionAuthority === false ? "ok" : "blocked" }),
    item({ title: "Paper PnL", detail: `total ${formatPct(paper.totalPnlPct)} · drawdown ${formatPct(paper.drawdownPct)}`, badge: formatPct(paper.totalPnlPct), status: paper.totalPnlPct < 0 ? "warn" : "ok" }),
    item({ title: "Drawdown summaries", detail: `portfolio drawdown ${formatPct(paper.drawdownPct)} · active lifecycle ${lifecycle.activeCount || 0}`, badge: paper.drawdownPct > 0 ? "watch" : "clear", status: paper.drawdownPct > 0 ? "warn" : "ok" }),
    ...((lifecyclePayload.ok === false) ? [
      item({ title: "Lifecycle summary unavailable", detail: lifecyclePayload.error || "lifecycle_summary_unavailable", badge: "review", status: "warn" })
    ] : []),
    item({ title: "Lifecycle states", detail: formatCounts(lifecycle.byStatus || {}) || "No lifecycle states recorded.", badge: lifecycle.mode || "manual", status: lifecycle.automationAllowed === false ? "ok" : "blocked" }),
    item({ title: "Close-policy presence", detail: `${manualClose.schema || "manual close policy"} · dispositions ${(manualClose.allowedDispositions || []).length}`, badge: manualClose.executionAuthority === false ? "manual-only" : "review", status: manualClose.executionAuthority === false ? "ok" : "warn" }),
    item({ title: "Replay comparison references", detail: `${comparison?.comparisonHash || "no comparison hash"} · run ${(replayRun.runHash || "missing").slice(0, 16)}`, badge: "reference", status: comparison ? "ok" : "missing" })
  ]);

  renderDashboardList("dashboard-live-readiness", [
    item({ title: "Implemented controls", detail: `${implementedControls.length}/${(readiness.controls || []).length || 12} implemented controls`, badge: `${implementedControls.length}/${(readiness.controls || []).length || 12}`, status: implementedControls.length === (readiness.controls || []).length ? "ok" : "warn" }),
    item({ title: "Blocking reasons", detail: compactList(readiness.blockingReasons || [], "No readiness blockers reported; policy still blocks live authority."), badge: (readiness.blockingReasons || []).length, status: readiness.liveExecutionAllowed ? "blocked" : "ok" }),
    item({ title: "Policy block", detail: `live execution blocked by policy · liveExecutionAllowed ${String(readiness.liveExecutionAllowed)}`, badge: readiness.liveExecutionAllowed ? "review" : "blocked", status: readiness.liveExecutionAllowed ? "blocked" : "ok" }),
    item({ title: "Readiness categories", detail: formatCounts(readinessGuidance.ownerSurfaceCounts || {}) || "No owner-surface counts loaded.", badge: readinessGuidance.status || "unknown", status: readinessGuidance.status || "unknown" }),
    item({ title: "Missing controls", detail: compactList(controlGaps.missing || [], "none"), badge: (controlGaps.missing || []).length, status: (controlGaps.missing || []).length ? "warn" : "ok" }),
    item({ title: "Partial controls", detail: compactList(controlGaps.partial || [], "none"), badge: (controlGaps.partial || []).length, status: (controlGaps.partial || []).length ? "warn" : "ok" }),
    item({ title: "Readiness guidance", detail: readinessGuidance.nextProofs?.[0] ? `${readinessGuidance.nextProofs[0].requiredProof} -> ${readinessGuidance.nextProofs[0].nextStep}` : "No next proof loaded; advisory-only boundary remains.", badge: readinessGuidance.totals?.blocking || 0, status: readinessGuidance.status || "blocked" })
  ]);

  renderDashboardList("dashboard-feed-venue", [
    item({
      title: "Current market diagnostics",
      detail: `Current runtime network/provider probe; independent from indexed feed-health evidence. ${diagnostics.summary || "No provider diagnostics loaded."}`,
      badge: diagnostics.overallStatus || "missing",
      status: diagnosticsStatusTone(diagnostics.overallStatus),
      surface: "current-diagnostics"
    }),
    dashboardEndpointStatus(diagnostics, "binance"),
    dashboardEndpointStatus(diagnostics, "coinbase"),
    item({ title: "DNS status", detail: formatCounts(countBy((diagnostics.endpoints || []).map((endpoint) => endpoint.dnsStatus || endpoint.status || "unknown"))) || "No DNS status rows.", badge: diagnostics.overallStatus || "unknown", status: diagnosticsStatusTone(diagnostics.overallStatus) }),
    item({ title: "HTTP status", detail: formatCounts(countBy((diagnostics.endpoints || []).map((endpoint) => endpoint.httpStatus || endpoint.status || "unknown"))) || "No HTTP status rows.", badge: diagnostics.reachableMarketFeedCount ?? 0, status: diagnosticsStatusTone(diagnostics.overallStatus) }),
    item({ title: "Venue status", detail: `${venueStatus.latest?.length || 0} venue rows · reliability ${venueReliability.overallStatus || "unknown"}`, badge: venueReliability.overallStatus || "unknown", status: venueReliability.overallStatus || "unknown" }),
    item({
      title: "Indexed feed-health timeline",
      detail: `${feedHealth.overallStatus || "unknown"} stored state · latest indexed ${latestSnapshot.status || "none"} · evidence feeds ${(feedHealth.feeds || []).length}. Compare with CURRENT diagnostics before treating this as a runtime network blocker.`,
      badge: feedHealth.qualityStatus || "unknown",
      status: feedHealth.overallStatus || "unknown",
      surface: "indexed-feed"
    })
  ]);

  renderDashboardList("dashboard-kill-switch", [
    item({ title: "Active kill-switch trips", detail: activeTrips.map((control) => control.controlType).join(", ") || "none", badge: activeTrips.length, status: activeTrips.length ? "blocked" : "ok" }),
    item({ title: "Kill-switch categories", detail: compactList(killControls.map((control) => control.controlType), "No kill-switch controls loaded."), badge: killControls.length, status: killControls.length ? "ok" : "missing" }),
    item({ title: "Stale data", detail: killControls.find((control) => String(control.controlType).includes("stale"))?.current?.reason || "No stale-data trip reported.", badge: "stale", status: "ok" }),
    item({ title: "Venue status", detail: killControls.find((control) => String(control.controlType).includes("venue"))?.current?.reason || `${venueReliability.overallStatus || "venue status unavailable"}`, badge: venueReliability.overallStatus || "unknown", status: venueReliability.overallStatus || "unknown" }),
    item({ title: "Drawdown", detail: killControls.find((control) => String(control.controlType).includes("drawdown"))?.current?.reason || `paper drawdown ${formatPct(paper.drawdownPct)}`, badge: formatPct(paper.drawdownPct), status: paper.drawdownPct > 0 ? "warn" : "ok" }),
    item({ title: "Market structure", detail: killControls.find((control) => String(control.controlType).includes("market"))?.current?.reason || "No market-structure trip reported.", badge: "review", status: "ok" }),
    item({ title: "Portfolio drawdown", detail: `paper portfolio drawdown ${formatPct(paper.drawdownPct)}`, badge: paper.drawdownPct > 0 ? "watch" : "clear", status: paper.drawdownPct > 0 ? "warn" : "ok" })
  ]);

  renderDashboardList("dashboard-tca-reconciliation", [
    ...((tcaPayload.ok === false) ? [
      item({ title: "TCA summary unavailable", detail: tcaPayload.error || "tca_summary_unavailable", badge: "review", status: "warn" })
    ] : []),
    item({ title: "TCA observations", detail: `${tcaSummary.count || tcaMetrics.count || 0} observations · by venue ${formatCounts(tcaSummary.byVenue || {}) || "none"}`, badge: tcaSummary.count || tcaMetrics.count || 0, status: (tcaSummary.count || tcaMetrics.count) ? "ok" : "missing" }),
    item({ title: "Slippage", detail: `average ${formatNumber(tcaSummary.averageSlippageBps ?? tcaMetrics.averageSlippageBps, 2)} bps`, badge: "bps", status: (tcaSummary.averageSlippageBps ?? tcaMetrics.averageSlippageBps) ? "warn" : "ok" }),
    item({ title: "Latency", detail: `average ${formatNumber(tcaSummary.averageLatencyMs ?? tcaMetrics.averageLatencyMs, 0)} ms`, badge: "latency", status: (tcaSummary.averageLatencyMs ?? tcaMetrics.averageLatencyMs) ? "review" : "ok" }),
    item({ title: "Partial fills", detail: `${tcaSummary.partialFillCount ?? tcaMetrics.partialFillCount ?? 0} partial · rate ${formatPct(tcaMetrics.partialFillRate)}`, badge: tcaSummary.partialFillCount ?? tcaMetrics.partialFillCount ?? 0, status: (tcaSummary.partialFillCount ?? tcaMetrics.partialFillCount) ? "warn" : "ok" }),
    item({ title: "Reject/miss counts", detail: `rejected ${tcaSummary.rejectedCount ?? tcaMetrics.rejectedCount ?? 0} · missed ${tcaSummary.missedCount ?? tcaMetrics.missedCount ?? 0} · cancelled ${tcaSummary.cancelledCount ?? tcaMetrics.cancelledCount ?? 0}`, badge: formatPct(tcaMetrics.rejectLikeRate), status: tcaMetrics.rejectLikeRate > 0 ? "warn" : "ok" }),
    item({ title: "Reconciliation checks", detail: `${reconciliation.checkCount || 0} checks · raw-backed ${reconciliation.rawBackedCount || 0}`, badge: reconciliation.executionAuthority ? "blocked" : "read-only", status: reconciliation.executionAuthority ? "blocked" : "ok" }),
    item({ title: "Mismatch summaries", detail: `${reconciliation.mismatchCount || 0} mismatches · ${reconciliation.issueCount || 0} issues · by venue ${formatCounts(reconciliation.byVenue || {}) || "none"}`, badge: reconciliation.mismatchCount || 0, status: reconciliation.mismatchCount ? "warn" : "ok" })
  ]);
}

function renderTopbar() {
  const readiness = state.data.readiness.liveReadiness;
  const feed = state.data.feedHealth.feedHealth;
  byId("live-pill").textContent = readiness.liveExecutionAllowed ? "Live allowed" : "Live blocked";
  byId("live-pill").className = `pill status-chip ${readiness.liveExecutionAllowed ? "bad" : "good"}`;
  byId("feed-pill").textContent = `Indexed feed ${feed.overallStatus || "unknown"}`;
  byId("feed-pill").className = `pill status-chip ${tone(feed.overallStatus)}`;
  byId("updated-pill").textContent = new Date().toLocaleTimeString();
}

function renderEntrance() {
  const readiness = state.data.readiness?.liveReadiness || {};
  const feed = state.data.feedHealth?.feedHealth || {};
  const analysisSummary = state.data.analysisStatus?.summary || {};
  const controls = readiness.controls || [];
  const implemented = controls.filter((control) => control.status === "implemented").length;
  const total = controls.length || 12;
  const setStatus = (id, value, status) => {
    const node = byId(id);
    if (!node) return;
    node.textContent = value;
    node.className = tone(status);
  };

  setStatus(
    "entrance-live-state",
    readiness.liveExecutionAllowed ? "REVIEW" : "BLOCKED",
    readiness.liveExecutionAllowed ? "blocked" : "ok"
  );
  setStatus("entrance-feed-state", String(feed.overallStatus || "unknown").toUpperCase(), feed.overallStatus || "missing");
  setStatus(
    "entrance-readiness-state",
    `${implemented}/${total}`,
    implemented === total ? "ok" : "warn"
  );
  setStatus(
    "entrance-analysis-state",
    analysisSummary.analysisControlPlanePassed ? "PASSED" : "REVIEW",
    analysisSummary.analysisControlPlanePassed ? "ok" : "warn"
  );
}

function candidateIntelligence(candidate) {
  return candidate?.intelligence || candidate?.proposal?.intelligence || {};
}

function intelligenceTone(intelligence = {}) {
  const severity = intelligence.anomaly?.highestSeverity;
  if (severity === "critical") return "blocked";
  if (severity === "warning") return "warn";
  const priority = String(intelligence.reviewPriority || "").toLowerCase();
  if (priority === "high" || priority === "standard") return "review";
  if (priority === "low" || priority === "watch") return "warn";
  return "";
}

function historicalConfidenceBucket(row = {}) {
  const confidence = Number(row.confidence);
  if (!Number.isFinite(confidence) || confidence <= 0) {
    return "unknown";
  }
  if (confidence >= 0.85) {
    return "high";
  }
  if (confidence >= 0.65) {
    return "standard";
  }
  return "low";
}

function priorityForCandidate(candidate) {
  return String(candidateIntelligence(candidate).reviewPriority || "UNKNOWN").toLowerCase();
}

function severityRank(value) {
  const ranks = {
    critical: 4,
    warning: 3,
    info: 2,
    none: 1
  };
  return ranks[String(value || "none").toLowerCase()] || 0;
}

function candidateMatchesPriority(candidate) {
  const filter = state.queue.candidatePriority;
  if (filter === "all") {
    return true;
  }
  return priorityForCandidate(candidate) === filter;
}

function visibleCandidates() {
  const rows = (state.data.candidates.candidates || [])
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidateMatchesPriority(candidate));

  return rows.sort((a, b) => {
    const left = a.candidate;
    const right = b.candidate;
    const leftIntel = candidateIntelligence(left);
    const rightIntel = candidateIntelligence(right);
    if (state.queue.candidateSort === "confidence") {
      return (right.proposal.confidence || 0) - (left.proposal.confidence || 0) || left.proposal.proposalId.localeCompare(right.proposal.proposalId);
    }
    if (state.queue.candidateSort === "symbol") {
      return left.proposal.symbol.localeCompare(right.proposal.symbol) || left.proposal.proposalId.localeCompare(right.proposal.proposalId);
    }
    if (state.queue.candidateSort === "anomaly") {
      return severityRank(rightIntel.anomaly?.highestSeverity) - severityRank(leftIntel.anomaly?.highestSeverity) || left.proposal.proposalId.localeCompare(right.proposal.proposalId);
    }
    return (leftIntel.rank ?? Number.MAX_SAFE_INTEGER) - (rightIntel.rank ?? Number.MAX_SAFE_INTEGER) || left.proposal.proposalId.localeCompare(right.proposal.proposalId);
  });
}

function persistedStatus(record) {
  return String(record.status || record.riskDecision || "recorded").toLowerCase();
}

function persistedMatchesStatus(record) {
  const filter = state.queue.persistedStatus;
  if (filter === "all") {
    return true;
  }
  const status = persistedStatus(record);
  if (filter === "blocked") {
    return status.includes("blocked") || status.includes("deny") || status.includes("rejected");
  }
  return status === filter;
}

function visiblePersistedProposals() {
  const records = state.data.queryProposals.proposals.proposals || [];
  const rows = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => persistedMatchesStatus(record));

  return rows.sort((a, b) => {
    const left = a.record;
    const right = b.record;
    if (state.queue.persistedSort === "oldest") {
      return a.index - b.index;
    }
    if (state.queue.persistedSort === "symbol") {
      return String(left.symbol || persistedProposalPayload(left).symbol || "").localeCompare(String(right.symbol || persistedProposalPayload(right).symbol || "")) || a.index - b.index;
    }
    if (state.queue.persistedSort === "status") {
      return persistedStatus(left).localeCompare(persistedStatus(right)) || b.index - a.index;
    }
    return b.index - a.index;
  });
}

function firstVisibleIndex(rows, fallback = 0) {
  return rows.length ? rows[0].index : fallback;
}

function applyQueueFilters() {
  const candidateRows = visibleCandidates();
  if (candidateRows.length && !candidateRows.some((row) => row.index === state.selectedCandidateIndex)) {
    state.selectedCandidateIndex = firstVisibleIndex(candidateRows);
  }
  const persistedRows = visiblePersistedProposals();
  if (persistedRows.length && !persistedRows.some((row) => row.index === state.selectedPersistedIndex)) {
    state.selectedPersistedIndex = firstVisibleIndex(persistedRows);
  }
}

function renderCandidateAbstentions() {
  const candidates = state.data.candidates;
  const abstentions = (candidates.abstentions || []).filter((entry) => abstentionMatchesFilter(entry));
  const anomaly = candidates.intelligence?.anomalySummary || {};
  const reasonCounts = abstentions.reduce((acc, item) => {
    acc[item.reason] = (acc[item.reason] || 0) + 1;
    return acc;
  }, {});
  const rows = [
    item({
      title: "Total abstentions",
      detail: `${candidates.totals.signals} signals scanned · ${candidates.abstentions?.length || 0} total abstentions`,
      badge: abstentions.length,
      status: abstentions.length > 0 ? "hold" : "ok"
    }),
    item({
      title: "Market anomalies",
      detail: `${anomaly.criticalCount || 0} critical · ${anomaly.warningCount || 0} warning`,
      badge: anomaly.highestSeverity || "none",
      status: anomaly.highestSeverity === "critical" ? "blocked" : anomaly.highestSeverity === "warning" ? "warn" : "ok"
    }),
    ...Object.entries(reasonCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([reason, count]) => item({
      title: reason,
      detail: "candidate abstention reason",
      badge: count,
      status: reason.includes("critical") ? "blocked" : "hold"
    }))
  ];

  byId("candidate-abstention-count").textContent = abstentions.length;
  byId("candidate-abstention-list").innerHTML = rows.join("");
}

function abstentionMatchesFilter(entry) {
  const filter = state.queue.abstentionFilter;
  const reason = String(entry?.reason || "").toLowerCase();
  if (filter === "all") return true;
  if (filter === "critical") return reason.includes("critical") || reason.includes("anomaly");
  if (filter === "feed") return reason.includes("feed");
  if (filter === "confidence") return reason.includes("confidence");
  if (filter === "neutral") return reason.includes("neutral") || reason.includes("direction");
  if (filter === "missing") return reason.includes("missing");
  return true;
}

function renderCandidates() {
  const total = state.data.candidates.candidates?.length || 0;
  const candidates = visibleCandidates();
  byId("candidate-count").textContent = `${candidates.length}/${total}`;
  byId("candidate-list").innerHTML = candidates.length
    ? candidates.map(({ candidate, index }) => {
      const proposal = candidate.proposal;
      const intelligence = candidateIntelligence(candidate);
      const anomalySeverity = intelligence.anomaly?.highestSeverity || "none";
      return item({
        title: `${proposal.symbol} ${proposal.side}`,
        detail: `${proposal.venue} · ${proposal.timeframe} · ${intelligence.reviewPriority || "UNKNOWN"} · anomaly ${anomalySeverity}`,
        badge: intelligence.rank ? `#${intelligence.rank}` : candidate.risk?.decision || formatPct(proposal.confidence),
        status: intelligenceTone(intelligence) || candidate.risk?.decision || "review",
        active: state.selectedKind === "candidate" && index === state.selectedCandidateIndex,
        index
      });
    }).join("")
    : item({
      title: "No candidates",
      detail: "No candidates match the current queue controls.",
      badge: "hold",
      status: "hold"
    });

  bindSelectableItems("candidate-list", (index) => {
    state.selectedKind = "candidate";
    state.selectedCandidateIndex = index;
    renderCandidates();
    renderPersistedProposals();
    renderSelectedProposalSurfaces();
  });
}

function persistedProposalPayload(record) {
  return record?.payload || {};
}

function renderPersistedProposals() {
  const total = state.data.queryProposals.proposals.proposals?.length || 0;
  const records = visiblePersistedProposals();
  byId("persisted-proposal-count").textContent = `${records.length}/${total}`;
  byId("persisted-proposal-list").innerHTML = records.length
    ? records.map(({ record, index }) => {
      const proposal = persistedProposalPayload(record);
      return item({
        title: `${record.symbol || proposal.symbol} ${record.side || proposal.side || ""}`.trim(),
        detail: `${record.venue} · ${record.proposalId}`,
        badge: record.status || "recorded",
        status: record.status || "recorded",
        active: state.selectedKind === "persisted" && index === state.selectedPersistedIndex,
        index
      });
    }).join("")
    : item({
      title: "No recorded proposals",
      detail: "No recorded proposals match the current queue controls.",
      badge: "empty",
      status: ""
    });

  bindSelectableItems("persisted-proposal-list", (index) => {
    state.selectedKind = "persisted";
    state.selectedPersistedIndex = index;
    renderCandidates();
    renderPersistedProposals();
    renderSelectedProposalSurfaces();
  });
}

function selectedProposal() {
  if (state.selectedKind === "persisted") {
    if (!visiblePersistedProposals().some((row) => row.index === state.selectedPersistedIndex)) {
      return null;
    }
    const record = (state.data.queryProposals.proposals.proposals || [])[state.selectedPersistedIndex];
    if (!record) {
      return null;
    }
    return {
      kind: "persisted",
      proposal: persistedProposalPayload(record),
      record,
      risk: {
        decision: record.riskDecision || "RECORDED",
        reason: record.riskReason || "query_index_record",
        reviewEligible: record.reviewEligible === true,
        allowExecution: false
      },
      lifecycle: record.lifecycleStatus ? {
        status: record.lifecycleStatus,
        positionId: record.positionId,
        terminal: record.lifecycleTerminal
      } : null
    };
  }

  if (!visibleCandidates().some((row) => row.index === state.selectedCandidateIndex)) {
    return null;
  }
  const candidate = (state.data.candidates.candidates || [])[state.selectedCandidateIndex];
  if (!candidate) {
    return null;
  }
  return {
    kind: "candidate",
    proposal: candidate.proposal,
    record: null,
    risk: candidate.risk,
    lifecycle: null
  };
}

function evidenceSummary(eventId) {
  const event = (state.data.evidence.events || []).find((candidate) => candidate.eventId === eventId);
  if (!event) {
    return `
      <span class="evidence-chip">
        <strong>${escapeHtml(eventId)}</strong>
        <span>not in latest evidence window</span>
      </span>
    `;
  }

  return `
    <span class="evidence-chip">
      <strong>${escapeHtml(event.eventId)}</strong>
      <span>${escapeHtml(event.type)} · ${escapeHtml(event.source)} · ${escapeHtml(event.observedAt)}</span>
    </span>
  `;
}

function compactList(values, fallback = "none") {
  return values?.length ? values.join(", ") : fallback;
}

function countBy(values, projector = (value) => value) {
  return values.reduce((acc, value) => {
    const key = String(projector(value) || "unknown").toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function formatCounts(counts) {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, value]) => `${key}:${value}`)
    .join(" · ");
}

function timelineItem({ title, detail, badge, status = "" }) {
  return `
    <article class="timeline-entry decision-step ${tone(status || badge)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
      <span class="tag status-chip ${tone(status || badge)}">${escapeHtml(badge)}</span>
    </article>
  `;
}

function riskThresholdDetail(proposal = {}) {
  const riskStatus = state.data.health?.risk || {};
  return [
    `confidence ${formatPct(proposal.confidence)} >= ${formatPct(riskStatus.minReviewConfidence)}`,
    `leverage ${proposal.leverage ?? "--"}x <= ${riskStatus.maxLeverage ?? "--"}x`,
    `max loss ${formatNumber(proposal.risk?.maxLossPct, 2)}% <= ${formatNumber(riskStatus.maxLossPct, 2)}%`
  ].join(" · ");
}

function selectedMarketContext() {
  const regime = state.data.regime?.regime || {};
  const feed = state.data.feedHealth?.feedHealth || {};
  const replayRun = state.data.replayRun?.replayRun || {};
  return { regime, feed, replayRun };
}

function renderRiskGate(selection) {
  const risk = selection.risk || {};
  const errors = risk.errors || [];
  const proposal = selection.proposal || {};

  byId("proposal-risk").innerHTML = [
    item({
      title: risk.decision || "--",
      detail: risk.reason || "--",
      badge: risk.reviewEligible ? "review eligible" : "hold",
      status: risk.decision || ""
    }),
    item({
      title: "Execution authority",
      detail: "This desk can review and record evidence only.",
      badge: risk.allowExecution ? "blocked" : "off",
      status: risk.allowExecution ? "blocked" : "ok"
    }),
    item({
      title: "Gate inputs",
      detail: riskThresholdDetail(proposal),
      badge: errors.length ? `${errors.length} errors` : "clear",
      status: errors.length ? "warn" : "ok"
    }),
    item({
      title: "Risk rationale",
      detail: `${risk.reason || "risk decision unavailable"} · ${risk.reviewEligible ? "manual review path open" : "manual review path held"} · execution remains off`,
      badge: risk.decision || "missing",
      status: risk.reviewEligible ? "review" : (risk.decision || "hold")
    }),
    item({
      title: "Blocking evidence",
      detail: compactList(errors, risk.reviewEligible ? "No schema blockers; manual review remains required." : "Review is held by the gate reason above."),
      badge: risk.reviewEligible ? "clear" : "held",
      status: risk.reviewEligible ? "ok" : "hold"
    })
  ].join("");
}

function renderProposalTimeline(selection) {
  const proposal = selection.proposal || {};
  const risk = selection.risk || {};
  const lifecycle = selection.lifecycle;
  const evidenceIds = proposal.evidenceIds || [];
  const { regime, feed, replayRun } = selectedMarketContext();
  const sourceLabel = selection.kind === "candidate" ? "Generated candidate" : "Indexed proposal";
  const sourceDetail = selection.kind === "candidate"
    ? `${proposal.symbol} ${proposal.side} from local evidence signals`
    : `${selection.record?.proposalId || proposal.proposalId} from query index`;

  byId("proposal-timeline").innerHTML = [
    timelineItem({
      title: sourceLabel,
      detail: sourceDetail,
      badge: selection.kind,
      status: "ok"
    }),
    timelineItem({
      title: "Evidence bundle",
      detail: compactList(evidenceIds.slice(0, 4), "No evidence ids attached"),
      badge: evidenceIds.length,
      status: evidenceIds.length ? "ok" : "missing"
    }),
    timelineItem({
      title: "Regime context",
      detail: `${regime.state || "UNKNOWN"} · ${regime.trend || "trend unknown"} · volatility ${regime.volatility?.bucket || "UNKNOWN"} · funding ${regime.funding?.bucket || "UNKNOWN"}`,
      badge: regime.calibration?.status || "uncalibrated",
      status: regime.state === "STRESS" ? "warn" : (regime.state ? "ok" : "missing")
    }),
    timelineItem({
      title: "Feed context",
      detail: `${feed.overallStatus || "unavailable"} · score ${feed.score ?? "--"} · ${(feed.reasons || []).slice(0, 2).join(", ") || "no feed blockers reported"}`,
      badge: feed.executionAuthority ? "blocked" : "read-only",
      status: feed.overallStatus || "missing"
    }),
    timelineItem({
      title: "Risk gate",
      detail: `${risk.reason || "risk decision unavailable"} · ${riskThresholdDetail(proposal)}`,
      badge: risk.decision || "missing",
      status: risk.decision || "missing"
    }),
    timelineItem({
      title: "Replay guard",
      detail: replayRun.leakageChecks?.reason || replayRun.mode || "No replay guard is loaded.",
      badge: replayRun.leakageChecks?.ok ? "causal" : (replayRun.leakageChecks?.reason || "missing"),
      status: replayRun.leakageChecks?.ok ? "ok" : "blocked"
    }),
    timelineItem({
      title: "Manual review",
      detail: risk.reviewEligible ? "Operator review is eligible; this dashboard remains read-only." : "Review action remains held.",
      badge: risk.reviewEligible ? "eligible" : "held",
      status: risk.reviewEligible ? "review" : "hold"
    }),
    timelineItem({
      title: "Lifecycle",
      detail: lifecycle?.positionId || "No manual lifecycle event is indexed for this proposal.",
      badge: lifecycle?.status || "missing",
      status: lifecycle?.status || "missing"
    })
  ].join("");
}

function renderProposalGuidance(selection) {
  const proposal = selection.proposal || {};
  const risk = selection.risk || {};
  const health = state.data.health || {};
  const manualClose = health.manualCloseWorkflow || {};
  const lifecycle = health.positionLifecycle || {};
  const evidenceCount = (proposal.evidenceIds || []).length;
  const allowedCloseDispositions = manualClose.allowedDispositions || [];
  const allowedLifecycleStatuses = manualClose.allowedLifecycleStatuses || lifecycle.allowedStatuses || [];

  byId("proposal-guidance").innerHTML = [
    item({
      title: "Manual outcome vocabulary",
      detail: `Allowed outcomes: ${ALLOWED_MANUAL_OUTCOMES.join(", ")}`,
      badge: evidenceCount ? "evidence-linked" : "needs evidence",
      status: evidenceCount ? "ok" : "missing"
    }),
    item({
      title: "Review disposition",
      detail: risk.reviewEligible ? "Review is eligible; outcome logging is outside this dashboard shell." : "Risk gate keeps this proposal in hold state.",
      badge: risk.reviewEligible ? "manual only" : "held",
      status: risk.reviewEligible ? "review" : "hold"
    }),
    item({
      title: "Close workflow",
      detail: allowedCloseDispositions.length ? allowedCloseDispositions.join(", ") : "No close dispositions reported by health status.",
      badge: manualClose.executionAuthority === false ? "no authority" : "check",
      status: manualClose.executionAuthority === false ? "ok" : "warn"
    }),
    item({
      title: "Lifecycle transition",
      detail: allowedLifecycleStatuses.length ? allowedLifecycleStatuses.join(", ") : "No lifecycle states reported by health status.",
      badge: "operator action",
      status: "review"
    }),
    item({
      title: "Execution boundary",
      detail: "The UI displays review evidence only; it has no order route, signed request path, or key material surface.",
      badge: "blocked",
      status: "ok"
    })
  ].join("");
}

function renderProposalDetail() {
  const selection = selectedProposal();
  const proposal = selection?.proposal;

  if (!proposal) {
    byId("proposal-title").textContent = "No Candidate";
    byId("proposal-confidence").textContent = "--";
    byId("proposal-detail").innerHTML = "";
    byId("proposal-intelligence").innerHTML = "";
    byId("proposal-risk").innerHTML = "";
    byId("proposal-timeline").innerHTML = "";
    byId("proposal-guidance").innerHTML = "";
    byId("proposal-market").innerHTML = "";
    byId("proposal-lifecycle").innerHTML = "";
    byId("proposal-evidence").innerHTML = "";
    return;
  }

  byId("proposal-title").textContent = `${proposal.symbol} ${proposal.side}`;
  byId("proposal-confidence").textContent = formatPct(proposal.confidence);
  byId("proposal-confidence").className = "tag good";
  byId("proposal-detail").innerHTML = [
    ["Proposal", proposal.proposalId],
    ["Venue", proposal.venue],
    ["Timeframe", proposal.timeframe],
    ["Entry", proposal.entry?.reference || "--"],
    ["Risk", `${formatNumber(proposal.risk?.maxLossPct, 2)}% max loss`],
    ["Thesis", proposal.thesis],
    ["Invalidation", proposal.invalidation]
  ].map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("");
  const intelligence = proposal.intelligence || {};
      const anomaly = intelligence.anomaly || {};
  byId("proposal-intelligence").innerHTML = [
    item({
      title: "Priority",
      detail: `${intelligence.rankerLabel || "unranked"} · ${intelligence.rankerAction || "ABSTAIN"}`,
      badge: intelligence.reviewPriority || "unknown",
      status: intelligenceTone(intelligence)
    }),
    item({
      title: "Rank probability",
      detail: intelligence.rank ? `rank ${intelligence.rank}` : "not ranked",
      badge: formatPct(intelligence.calibratedProbability),
      status: "ok"
    }),
    item({
      title: "Anomaly context",
      detail: `${anomaly.issueCount || 0} issues · ${(anomaly.issueTypes || []).join(", ") || "none"}`,
      badge: anomaly.highestSeverity || "none",
      status: anomaly.highestSeverity === "critical" ? "blocked" : anomaly.highestSeverity === "warning" ? "warn" : "ok"
    })
  ].join("");
  renderRiskGate(selection);
  renderProposalTimeline(selection);
  renderProposalGuidance(selection);
   byId("proposal-lifecycle").innerHTML = selection.lifecycle
     ? item({
       title: selection.lifecycle.status,
       detail: selection.lifecycle.positionId || "linked proposal lifecycle",
       badge: selection.lifecycle.terminal ? "terminal" : "active",
       status: selection.lifecycle.status
     })
     : item({
       title: "No lifecycle state",
       detail: "No manual lifecycle event is indexed for this proposal.",
       badge: "missing",
       status: "missing"
     });

   const regime = state.data.regime?.regime;
   const feed = state.data.feedHealth?.feedHealth;
   const replayRun = state.data.replayRun?.replayRun;
   byId("proposal-market").innerHTML = [
     item({
       title: "Regime",
       detail: regime?.state || "unavailable",
       badge: regime?.calibration?.status || "unknown",
       status: regime ? "ok" : "missing"
     }),
     item({
       title: "Feed health",
       detail: feed?.overallStatus || "unavailable",
       badge: feed?.score ? `${feed.score}/1.0` : "unknown",
       status: feed ? tone(feed.overallStatus) : "missing"
     }),
     item({
       title: "Replay leakage",
       detail: replayRun?.mode || "unavailable",
       badge: replayRun?.leakageChecks?.ok ? "clear" : (replayRun?.leakageChecks?.reason || "blocked"),
       status: replayRun?.leakageChecks?.ok ? "ok" : "blocked"
     })
   ].join("");
  byId("proposal-evidence").innerHTML = (proposal.evidenceIds || [])
    .map(evidenceSummary)
    .join("");
}

function selectedEvidenceEvents(proposal) {
  const evidenceIds = new Set(proposal?.evidenceIds || []);
  if (!evidenceIds.size) {
    return [];
  }
  return (state.data.evidence.events || [])
    .filter((event) => evidenceIds.has(event.eventId))
    .sort((left, right) => String(left.observedAt || "").localeCompare(String(right.observedAt || "")));
}

function reviewEventsForProposal(proposal) {
  const proposalId = proposal?.proposalId;
  if (!proposalId) {
    return [];
  }
  return (state.data.evidence.events || [])
    .filter((event) => {
      if (event.type !== "review_disposition") {
        return false;
      }
      const payload = event.payload || {};
      return payload.proposalId === proposalId || payload.proposal?.proposalId === proposalId;
    })
    .sort((left, right) => String(left.observedAt || "").localeCompare(String(right.observedAt || "")));
}

function renderReviewBrief() {
  const summaryList = byId("brief-summary-list");
  if (!summaryList) {
    return;
  }

  const evidenceList = byId("brief-evidence-list");
  const marketList = byId("brief-market-list");
  const dispositionList = byId("brief-disposition-list");
  const replayList = byId("brief-replay-list");
  const status = byId("brief-status");
  const selection = selectedProposal();
  const proposal = selection?.proposal;

  if (!proposal) {
    status.textContent = "No selection";
    status.className = "tag neutral";
    summaryList.innerHTML = item({
      title: "No proposal selected",
      detail: "Choose a candidate or recorded proposal in the Queue tab to populate this brief.",
      badge: "empty",
      status: "missing"
    });
    evidenceList.innerHTML = "";
    marketList.innerHTML = "";
    dispositionList.innerHTML = "";
    replayList.innerHTML = "";
    return;
  }

  const risk = selection.risk || {};
  const lifecycle = selection.lifecycle;
  const evidenceIds = proposal.evidenceIds || [];
  const evidenceEvents = selectedEvidenceEvents(proposal);
  const missingEvidence = evidenceIds.filter((eventId) => !evidenceEvents.some((event) => event.eventId === eventId));
  const evidenceTimes = evidenceEvents.map((event) => event.observedAt).filter(Boolean);
  const firstEvidenceAt = evidenceTimes[0];
  const latestEvidenceAt = evidenceTimes.at(-1);
  const evidenceTypeCounts = countBy(evidenceEvents, (event) => event.type);
  const evidenceSourceCounts = countBy(evidenceEvents, (event) => event.source);
  const reviewEvents = reviewEventsForProposal(proposal);
  const latestReview = reviewEvents.at(-1);
  const reviewLatency = latestReview?.observedAt && firstEvidenceAt
    ? formatDurationCompact(firstEvidenceAt, latestReview.observedAt)
    : "pending";
  const manualCloseStatus = state.data.health?.manualCloseWorkflow || {};
  const allowedDispositions = manualCloseStatus.allowedDispositions || [];
  const allowedLifecycleStates = manualCloseStatus.allowedLifecycleStatuses || state.data.health?.positionLifecycle?.allowedStatuses || [];
  const workflow = state.data.manualCloseWorkflow.workflow || {};
  const replayRun = state.data.replayRun.replayRun;
  const comparison = state.data.replayCompare.comparison;
  const metrics = state.data.metrics.metrics;
  const proposalMetrics = metrics.proposalMetrics || {};
  const labels = metrics.replayLabelMetrics || {};
  const calibration = proposalMetrics.calibration || {};
  const runHash = replayRun.runHash || "unavailable";
  const configHash = replayRun.configHash || "unavailable";
  const { regime, feed } = selectedMarketContext();
  const readiness = state.data.readiness.liveReadiness || {};
  const controlGaps = readiness.controlGaps || {};
  const publicContext = state.data.publicContext.context || {};
  const diagnostics = diagnosticsReport();
  const diagnosticsCard = diagnosticsNarrative(diagnostics);
  const venueReliability = state.data.venueReliability.reliability || {};

  status.textContent = risk.reviewEligible ? "Review ready" : "Held";
  status.className = `tag ${tone(risk.reviewEligible ? "review" : risk.decision || "hold")}`;

  summaryList.innerHTML = [
    item({
      title: `${proposal.symbol || "UNKNOWN"} ${proposal.side || ""}`.trim(),
      detail: `${proposal.proposalId || "no id"} · ${proposal.venue || "unknown venue"} · ${proposal.timeframe || "unknown timeframe"}`,
      badge: selection.kind,
      status: "ok"
    }),
    item({
      title: "Operator focus",
      detail: proposal.thesis || "No thesis recorded.",
      badge: formatPct(proposal.confidence),
      status: "review"
    }),
    item({
      title: "Invalidation",
      detail: proposal.invalidation || "No invalidation statement recorded.",
      badge: proposal.risk?.maxLossPct === undefined ? "risk missing" : `${formatNumber(proposal.risk.maxLossPct, 2)}% max loss`,
      status: proposal.invalidation ? "ok" : "missing"
    }),
    item({
      title: "Gate state",
      detail: risk.reason || "Risk reason unavailable.",
      badge: risk.decision || "missing",
      status: risk.decision || "missing"
    })
  ].join("");

  evidenceList.innerHTML = [
    barRow({
      title: "Evidence coverage",
      detail: `${evidenceEvents.length} of ${evidenceIds.length} attached ids are present in the loaded evidence window`,
      value: evidenceEvents.length,
      total: evidenceIds.length,
      status: missingEvidence.length ? "warn" : evidenceIds.length ? "ok" : "missing"
    }),
    item({
      title: "Attached ids",
      detail: compactList(evidenceIds.slice(0, 6), "No evidence ids attached."),
      badge: evidenceIds.length,
      status: evidenceIds.length ? "ok" : "missing"
    }),
    item({
      title: "Loaded evidence types",
      detail: formatCounts(evidenceTypeCounts) || "No attached evidence is visible in the current window.",
      badge: evidenceEvents.length,
      status: evidenceEvents.length ? "ok" : "missing"
    }),
    item({
      title: "Evidence lineage window",
      detail: firstEvidenceAt || latestEvidenceAt ? `${firstEvidenceAt || "unknown start"} -> ${latestEvidenceAt || "unknown latest"}` : "No observedAt timestamp available.",
      badge: missingEvidence.length ? `${missingEvidence.length} missing` : "complete",
      status: missingEvidence.length ? "warn" : "ok"
    }),
    item({
      title: "Evidence source mix",
      detail: formatCounts(evidenceSourceCounts) || "No source mix is visible in the current evidence window.",
      badge: Object.keys(evidenceSourceCounts).length || "none",
      status: Object.keys(evidenceSourceCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Missing evidence ids",
      detail: compactList(missingEvidence.slice(0, 6), "All attached evidence ids are loaded."),
      badge: missingEvidence.length || "none",
      status: missingEvidence.length ? "warn" : "ok"
    })
  ].join("");

  marketList.innerHTML = [
    item({
      title: "Regime context",
      detail: `${regime.state || "UNKNOWN"} · ${regime.trend || "trend unknown"} · volatility ${regime.volatility?.bucket || "UNKNOWN"} · funding ${regime.funding?.bucket || "UNKNOWN"}`,
      badge: regime.calibration?.status || "uncalibrated",
      status: regime.state === "STRESS" ? "warn" : (regime.state ? "ok" : "missing")
    }),
    item({
      title: "Feed and venue",
      detail: `feed ${feed.overallStatus || "unavailable"} · venue ${venueReliability.overallStatus || "unavailable"} · venues ${venueReliability.venueCount || 0}`,
      badge: feed.executionAuthority || venueReliability.executionAuthority ? "blocked" : "read-only",
      status: feed.overallStatus === "healthy" && venueReliability.overallStatus === "OPERATIONAL" ? "ok" : "warn"
    }),
    item({
      title: "Public context boundary",
      detail: `${publicContext.sourceCount || 0} sources · ${publicContext.eventCount || 0} events · fixture ${publicContext.fixtureBacked ? "yes" : "no"} · ${publicContext.liveNetworkEnabled ? "network on" : "network off"}`,
      badge: publicContext.liveNetworkEnabled ? "network" : "offline",
      status: publicContext.liveNetworkEnabled ? "warn" : "ok"
    }),
    item(diagnosticsCard),
    item({
      title: "Readiness gaps",
      detail: `missing ${(controlGaps.missing || []).length} · partial ${(controlGaps.partial || []).length} · blockers ${(readiness.blockingReasons || []).slice(0, 2).join(", ") || "policy boundary"}`,
      badge: readiness.liveExecutionAllowed ? "review" : "blocked",
      status: readiness.liveExecutionAllowed ? "blocked" : "ok"
    }),
    item({
      title: "Review boundary",
      detail: "Brief context is read-only and cannot authorize live mode or unblock risk gates.",
      badge: readiness.canPlaceOrders ? "blocked" : "advisory",
      status: readiness.canPlaceOrders ? "blocked" : "ok"
    })
  ].join("");

  dispositionList.innerHTML = [
    item({
      title: "Risk gate",
      detail: risk.reviewEligible ? "Manual review can be recorded for this proposal." : "Risk gate keeps this proposal in hold state.",
      badge: risk.reviewEligible ? "eligible" : "held",
      status: risk.reviewEligible ? "review" : "hold"
    }),
    item({
      title: "Outcome vocabulary",
      detail: ALLOWED_MANUAL_OUTCOMES.join(", "),
      badge: "fixed",
      status: "ok"
    }),
    item({
      title: "Close dispositions",
      detail: compactList(allowedDispositions, "No close-disposition list reported."),
      badge: manualCloseStatus.executionAuthority === false ? "manual only" : "review",
      status: manualCloseStatus.executionAuthority === false ? "ok" : "warn"
    }),
    item({
      title: "Lifecycle states",
      detail: compactList(allowedLifecycleStates, "No lifecycle-state list reported."),
      badge: lifecycle?.status || "not indexed",
      status: lifecycle ? "review" : "missing"
    }),
    item({
      title: "Audit trail",
      detail: latestReview ? `${reviewEvents.length} review dispositions · latest ${latestReview.observedAt || "timestamp unavailable"}` : `${workflow.count || 0} close workflows indexed locally.`,
      badge: latestReview?.payload?.outcome || latestReview?.payload?.disposition || reviewEvents.length || "none",
      status: latestReview ? "ok" : "missing"
    }),
    item({
      title: "Review latency",
      detail: latestReview
        ? `First evidence to latest disposition: ${reviewLatency}`
        : "No recorded disposition yet for this proposal.",
      badge: latestReview ? reviewLatency : "pending",
      status: latestReview ? "review" : "hold"
    })
  ].join("");

  replayList.innerHTML = [
    item({
      title: "Replay run",
      detail: `run ${runHash.slice(0, 16)} · config ${configHash.slice(0, 16)}`,
      badge: replayRun.mode || "local",
      status: replayRun.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Leakage scan",
      detail: replayRun.leakageChecks?.reason || "causal replay check",
      badge: replayRun.leakageChecks?.ok ? "clear" : "blocked",
      status: replayRun.leakageChecks?.ok ? "ok" : "blocked"
    }),
    item({
      title: "Candidate replay",
      detail: `${replayRun.candidateReplay?.candidateCount || 0} candidates · ${replayRun.candidateReplay?.abstentionCount || 0} abstentions`,
      badge: formatPct(state.data.metrics.metrics.candidateMetrics?.abstentionRate),
      status: replayRun.candidateReplay?.abstentionCount ? "hold" : "ok"
    }),
    item({
      title: "Baseline comparison",
      detail: comparison?.comparisonHash || "No comparison hash available.",
      badge: comparison?.delta?.candidateCount ?? "missing",
      status: comparison ? "review" : "missing"
    }),
    item({
      title: "Calibration context",
      detail: `${calibration.labeledCount || 0} directional outcomes · labels ${labels.labelCount || 0}`,
      badge: calibration.status || "unknown",
      status: calibration.status === "insufficient_labels" ? "hold" : "ok"
    }),
    item({
      title: "Label coverage",
      detail: `${labels.labelCount || 0} explicit labels · coverage ${formatPct(labels.coverage?.explicitCoverage)} · recall ${labels.recall === null ? labels.recallReason || "unavailable" : formatPct(labels.recall)}`,
      badge: labels.labelCount || "none",
      status: labels.labelCount ? "ok" : "hold"
    })
  ].join("");
}

function renderSelectedProposalSurfaces() {
  renderProposalDetail();
  renderReviewBrief();
  renderDispositionKit();
}

function renderEvidence() {
  const events = state.data.evidence.events || [];
  byId("evidence-count").textContent = events.length;
  byId("evidence-list").innerHTML = events.slice().reverse().map((event) => `
    <article class="timeline-entry">
      <strong>${escapeHtml(event.type)} · ${escapeHtml(event.eventId)}</strong>
      <span>${escapeHtml(event.source)} · ${escapeHtml(event.symbol || event.venue || "system")} · ${escapeHtml(event.observedAt)}</span>
    </article>
  `).join("");
}

function renderReplayMetrics() {
  const metrics = state.data.metrics.metrics;
  const proposal = metrics.proposalMetrics;
  const candidates = metrics.candidateMetrics;
  const labels = metrics.replayLabelMetrics;
  const tca = metrics.tcaMetrics;
  const calibration = proposal.calibration || {};
  const rows = [
    ["Proposal precision", formatPct(proposal.precision)],
    ["False positives", formatPct(proposal.falsePositiveRate)],
    ["Brier score", formatNumber(calibration.brierScore, 3)],
    ["ECE", formatPct(calibration.expectedCalibrationError)],
    ["Explicit-label recall", labels.recall === null ? labels.recallReason : formatPct(labels.recall)],
    ["Risk abstentions", formatPct(proposal.abstentionRate)],
    ["Candidate abstentions", formatPct(candidates.abstentionRate)],
    ["TCA reject-like", formatPct(tca.rejectLikeRate)],
    ["Partial fills", formatPct(tca.partialFillRate)],
    ["Average fee bps", formatNumber(tca.averageFeeBps, 2)],
    ["Average latency ms", formatNumber(tca.averageLatencyMs, 0)]
  ];

  byId("replay-metrics").innerHTML = rows.map(([title, value]) => item({
    title,
    detail: "evidence-backed",
    badge: value,
    status: "ok"
  })).join("");
}

function renderReplayRun() {
  const replayRun = state.data.replayRun.replayRun;
  const rows = [
    ["Run", replayRun.runHash.slice(0, 16), replayRun.leakageChecks.ok ? "ok" : "blocked"],
    ["Config", replayRun.configHash.slice(0, 16), "ok"],
    ["Events", replayRun.eventCount, "ok"],
    ["Candidates", replayRun.candidateReplay.candidateCount, "review"],
    ["Abstentions", replayRun.candidateReplay.abstentionCount, replayRun.candidateReplay.abstentionCount > 0 ? "hold" : "ok"],
    ["Leakage", replayRun.leakageChecks.ok ? "clear" : "blocked", replayRun.leakageChecks.ok ? "ok" : "blocked"]
  ];

  byId("replay-run-list").innerHTML = rows.map(([title, badge, status]) => item({
    title,
    detail: replayRun.mode,
    badge,
    status
  })).join("");
}

function renderReviewTrends() {
  const records = state.data.queryProposals.proposals.proposals || [];
  const events = state.data.evidence.events || [];
  const workflow = state.data.manualCloseWorkflow.workflow || {};
  const replayRun = state.data.replayRun.replayRun;
  const comparison = state.data.replayCompare.comparison;
  const dispositions = events.filter((event) => event.type === "review_disposition");
  const outcomeValues = [
    ...records.map((record) => record.outcome).filter(Boolean),
    ...dispositions.map((event) => event.payload?.outcome || event.payload?.disposition).filter(Boolean)
  ];
  const riskCounts = countBy(records, (record) => record.riskDecision || record.status || "recorded");
  const outcomeCounts = countBy(outcomeValues);
  const eventCounts = countBy(events, (event) => event.type);
  const eventBars = Object.entries(eventCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4);
  const timestamps = events.map((event) => event.observedAt).filter(Boolean).sort();
  const windowLabel = timestamps.length
    ? `${timestamps[0]} -> ${timestamps.at(-1)}`
    : "No evidence events in the loaded window.";

  byId("review-trend-list").innerHTML = [
    item({
      title: "Review window",
      detail: `${records.length} indexed proposals · ${dispositions.length} review dispositions`,
      badge: records.length ? "indexed" : "empty",
      status: records.length ? "ok" : "missing"
    }),
    item({
      title: "Outcome mix",
      detail: formatCounts(outcomeCounts) || "No manual outcomes in the loaded evidence window.",
      badge: outcomeValues.length,
      status: outcomeValues.length ? "review" : "missing"
    }),
    item({
      title: "Risk decision mix",
      detail: formatCounts(riskCounts) || "No query-indexed risk decisions.",
      badge: Object.keys(riskCounts).length,
      status: Object.keys(riskCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Evidence window",
      detail: windowLabel,
      badge: events.length,
      status: events.length ? "ok" : "missing"
    }),
    item({
      title: "Event mix",
      detail: formatCounts(eventCounts) || "No evidence event mix available.",
      badge: Object.keys(eventCounts).length,
      status: Object.keys(eventCounts).length ? "ok" : "missing"
    }),
    ...eventBars.map(([eventType, count]) => barRow({
      title: eventType,
      detail: "share of loaded evidence window",
      value: count,
      total: events.length,
      status: "ok"
    })),
    item({
      title: "Replay anchor",
      detail: `${replayRun.candidateReplay.candidateCount} candidates · ${replayRun.candidateReplay.abstentionCount} abstentions · ${(comparison?.comparisonHash || "no comparison").slice(0, 16)}`,
      badge: replayRun.leakageChecks.ok ? "causal" : "blocked",
      status: replayRun.leakageChecks.ok ? "ok" : "blocked"
    }),
    item({
      title: "Manual close workflow",
      detail: `${workflow.count || 0} close recommendation workflows in local evidence.`,
      badge: workflow.executionAuthority ? "blocked" : "off",
      status: workflow.executionAuthority ? "blocked" : "ok"
    })
  ].join("");
}

function historicalRows() {
  const intelligence = state.data.reviewIntelligence?.reviewIntelligence || {};
  const candidates = (intelligence.candidates || []).map((row) => ({
    ...row,
    kind: "candidate",
    reason: "",
    reviewPriority: row.reviewPriority || "UNKNOWN"
  }));
  const abstentions = (intelligence.abstentions || []).map((row) => ({
    ...row,
    kind: "abstention",
    reviewPriority: "ABSTAIN"
  }));

  return [...candidates, ...abstentions].sort((left, right) => (
    String(right.observedAt || "").localeCompare(String(left.observedAt || "")) ||
    String(left.eventId || "").localeCompare(String(right.eventId || ""))
  ));
}

function historicalRowMatches(row) {
  const filters = state.reviewHistory;
  if (filters.kind !== "all" && row.kind !== filters.kind) {
    return false;
  }
  if (filters.signalTier !== "all" && String(row.signalTier || "").toLowerCase() !== filters.signalTier) {
    return false;
  }
  if (filters.reviewPriority !== "all" && String(row.reviewPriority || "").toLowerCase() !== filters.reviewPriority) {
    return false;
  }
  if (filters.abstentionReason !== "all") {
    if (row.kind !== "abstention" || String(row.reason || "").toLowerCase() !== filters.abstentionReason) {
      return false;
    }
  }
  if (filters.direction !== "all" && String(row.direction || "").toLowerCase() !== filters.direction) {
    return false;
  }
  if (filters.confidenceBucket !== "all" && historicalConfidenceBucket(row) !== filters.confidenceBucket) {
    return false;
  }
  if (filters.source !== "all" && String(row.source || "").toLowerCase() !== filters.source) {
    return false;
  }
  if (filters.anomalySeverity !== "all" && String(row.anomalySeverity || "none").toLowerCase() !== filters.anomalySeverity) {
    return false;
  }
  return true;
}

function renderHistoricalSourceFilterOptions(rows = historicalRows()) {
  const select = byId("historical-source-filter");
  if (!select) {
    return;
  }

  const sources = [...new Set(rows.map((row) => String(row.source || "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const current = state.reviewHistory.source;
  const normalizedSources = new Set(sources.map((source) => source.toLowerCase()));
  if (current !== "all" && !normalizedSources.has(current)) {
    state.reviewHistory.source = "all";
  }

  select.innerHTML = [
    '<option value="all">All</option>',
    ...sources.map((source) => `<option value="${escapeHtml(source.toLowerCase())}">${escapeHtml(source)}</option>`)
  ].join("");
  select.value = state.reviewHistory.source;
}

function renderHistoricalIntelligence() {
  const intelligence = state.data.reviewIntelligence?.reviewIntelligence || {};
  const readiness = intelligence.readiness || {};
  const operatorContext = intelligence.operatorContext || {};
  const operatorTimeWindow = operatorContext.timeWindow || {};
  const evidenceDensity = operatorContext.evidenceDensity || {};
  const readinessDimensions = readiness.dimensions || [];
  const readinessNextChecks = readiness.nextChecks || [];
  const allRows = historicalRows();
  renderHistoricalSourceFilterOptions(allRows);
  const rows = allRows.filter(historicalRowMatches);
  const candidates = rows.filter((row) => row.kind === "candidate");
  const abstentions = rows.filter((row) => row.kind === "abstention");
  const tierCounts = countBy(rows, (row) => row.signalTier);
  const kindCounts = countBy(rows, (row) => row.kind);
  const directionCounts = countBy(rows, (row) => row.direction);
  const confidenceCounts = countBy(rows, (row) => historicalConfidenceBucket(row));
  const anomalyCounts = countBy(rows, (row) => row.anomalySeverity || "none");
  const priorityCounts = countBy(candidates, (row) => row.reviewPriority);
  const reasonCounts = countBy(abstentions, (row) => row.reason);
  const sourceCounts = countBy(rows, (row) => row.source || "unknown");
  const tiers = Object.entries(tierCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const activeFilters = Object.entries(state.reviewHistory)
    .filter(([, value]) => value !== "all")
    .map(([key, value]) => `${key}:${value}`);

  byId("historical-intelligence-count").textContent = rows.length;
  byId("historical-intelligence-list").innerHTML = [
    item({
      title: "Historical readiness",
      detail: `${readinessDimensions.length || 0} dimensions · next checks ${readinessNextChecks.length || 0}`,
      badge: readiness.status || "unknown",
      status: readiness.status === "passed" ? "ok" : readiness.status === "blocked" ? "blocked" : "warn"
    }),
    item({
      title: "Operator context",
      detail: `${operatorContext.rowCount || 0} rows · ${operatorTimeWindow.firstObservedAt || "no first timestamp"} -> ${operatorTimeWindow.lastObservedAt || "no last timestamp"}`,
      badge: operatorContext.status || "unknown",
      status: operatorContext.status === "passed" ? "ok" : operatorContext.status === "blocked" ? "blocked" : "warn"
    }),
    item({
      title: "Direction mix",
      detail: formatCounts(operatorContext.directionCounts || {}) || "No direction context is available.",
      badge: Object.keys(operatorContext.directionCounts || {}).length,
      status: Object.keys(operatorContext.directionCounts || {}).length ? "ok" : "missing"
    }),
    item({
      title: "Confidence buckets",
      detail: formatCounts(operatorContext.confidenceBucketCounts || {}) || "No confidence buckets are available.",
      badge: Object.keys(operatorContext.confidenceBucketCounts || {}).length,
      status: Object.keys(operatorContext.confidenceBucketCounts || {}).length ? "ok" : "missing"
    }),
    item({
      title: "Evidence density",
      detail: `${formatPct(evidenceDensity.eventIdCoveragePct)} event-id coverage · ${formatNumber(evidenceDensity.avgEvidenceIdsPerCandidate, 2)} evidence ids/candidate`,
      badge: evidenceDensity.evidenceIdCount || 0,
      status: evidenceDensity.eventIdCoveragePct >= 1 ? "ok" : "warn"
    }),
    item({
      title: "Filter result",
      detail: `${candidates.length} candidates · ${abstentions.length} abstentions · ${intelligence.unfilteredSummary?.signalCount || allRows.length} unfiltered signals`,
      badge: rows.length,
      status: rows.length ? "ok" : "missing"
    }),
    item({
      title: "Active filters",
      detail: activeFilters.join(" · ") || "all local historical intelligence rows",
      badge: activeFilters.length || "all",
      status: activeFilters.length ? "review" : "ok"
    }),
    item({
      title: "Row type mix",
      detail: formatCounts(kindCounts) || "No row-type mix matches the filters.",
      badge: Object.keys(kindCounts).length,
      status: Object.keys(kindCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Filtered direction mix",
      detail: formatCounts(directionCounts) || "No direction mix matches the filters.",
      badge: Object.keys(directionCounts).length,
      status: Object.keys(directionCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Filtered confidence mix",
      detail: formatCounts(confidenceCounts) || "No confidence buckets match the filters.",
      badge: Object.keys(confidenceCounts).length,
      status: Object.keys(confidenceCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Filtered source mix",
      detail: formatCounts(sourceCounts) || "No local signal sources match the filters.",
      badge: Object.keys(sourceCounts).length,
      status: Object.keys(sourceCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Anomaly severity mix",
      detail: formatCounts(anomalyCounts) || "No anomaly severity context matches the filters.",
      badge: Object.keys(anomalyCounts).length,
      status: anomalyCounts.CRITICAL ? "blocked" : anomalyCounts.WARNING ? "warn" : Object.keys(anomalyCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Signal-tier mix",
      detail: formatCounts(tierCounts) || "No signal-tier rows match the filters.",
      badge: Object.keys(tierCounts).length,
      status: Object.keys(tierCounts).length ? "ok" : "missing"
    }),
    item({
      title: "Candidate intelligence",
      detail: formatCounts(priorityCounts) || "No candidate-intelligence rows match the filters.",
      badge: candidates.length,
      status: candidates.length ? "review" : "missing"
    }),
    item({
      title: "Abstention outcomes",
      detail: formatCounts(reasonCounts) || "No abstention outcomes match the filters.",
      badge: abstentions.length,
      status: abstentions.length ? "hold" : "ok"
    }),
    ...tiers.map(([tier, count]) => barRow({
      title: `Signal tier ${tier}`,
      detail: "share of filtered historical intelligence rows",
      value: count,
      total: rows.length,
      status: tier === "WEAK" || tier === "NEUTRAL" ? "hold" : "ok"
    })),
    ...rows.slice(0, 5).map((row) => item({
      title: `${row.kind === "candidate" ? "Candidate" : "Abstention"} ${row.symbol || "UNKNOWN"}`,
      detail: row.kind === "candidate"
        ? `${row.reviewPriority || "UNKNOWN"} · ${row.rankerLabel || "UNRANKED"} · ${historicalConfidenceBucket(row)} confidence · ${row.source || "unknown source"} · ${row.observedAt || "no timestamp"}`
        : `${row.reason || "unknown_reason"} · ${historicalConfidenceBucket(row)} confidence · ${row.source || "unknown source"} · ${row.observedAt || "no timestamp"}`,
      badge: row.signalTier || "UNKNOWN",
      status: row.kind === "abstention" ? "hold" : row.reviewPriority
    }))
  ].join("");
}

function renderReplayComparison() {
  const comparison = state.data.replayCompare.comparison;
  if (!comparison) {
    byId("replay-comparison-list").innerHTML = item({
      title: "No comparison",
      detail: "No baseline/challenger replay comparison is available.",
      badge: "missing",
      status: "missing"
    });
    return;
  }

  const delta = comparison.delta || {};
  const baseline = comparison.baseline || {};
  const challenger = comparison.challenger || {};
  byId("replay-comparison-list").innerHTML = [
    item({
      title: "Comparison hash",
      detail: comparison.comparisonHash || "unavailable",
      badge: "hash",
      status: "ok"
    }),
    item({
      title: "Candidate delta",
      detail: `${baseline.candidateCount ?? "--"} baseline -> ${challenger.candidateCount ?? "--"} challenger`,
      badge: delta.candidateCount ?? "--",
      status: delta.candidateCount > 0 ? "review" : "ok"
    }),
    item({
      title: "Abstention delta",
      detail: `${formatPct(baseline.abstentionRate)} baseline -> ${formatPct(challenger.abstentionRate)} challenger`,
      badge: formatPct(delta.abstentionRate),
      status: delta.abstentionRate > 0 ? "warn" : "ok"
    }),
    item({
      title: "Recall delta",
      detail: "explicit replay labels only",
      badge: delta.recall === null ? "insufficient" : formatPct(delta.recall),
      status: delta.recall === null ? "hold" : "ok"
    }),
    item({
      title: "Authority boundary",
      detail: comparison.mode,
      badge: comparison.executionAuthority ? "blocked" : "off",
      status: comparison.executionAuthority ? "blocked" : "ok"
    })
  ].join("");
}

function renderReplayDiagnostics() {
  const replayRun = state.data.replayRun.replayRun;
  const regimeSplits = state.data.replaySplits?.split || replayRun.regimeSplits || {};
  const metrics = state.data.metrics.metrics;
  const labels = metrics.replayLabelMetrics;
  const proposal = metrics.proposalMetrics;
  const candidates = metrics.candidateMetrics;
  const tca = metrics.tcaMetrics;
  const leakage = replayRun.leakageChecks || {};
  const snapshots = replayRun.featureSnapshots || {};
  const calibration = proposal.calibration || {};
  const leakageIssues = [
    leakage.futureParentCount,
    leakage.futureCandleCount,
    leakage.futureObservationCount,
    leakage.forbiddenFeatureFieldCount,
    leakage.postDispositionFieldCount
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);

  byId("replay-diagnostic-list").innerHTML = [
    item({
      title: "Leakage scan",
      detail: `${leakageIssues} causal-integrity findings · ${snapshots.snapshotCount || 0} feature snapshots`,
      badge: leakage.ok ? "clear" : "blocked",
      status: leakage.ok ? "ok" : "blocked"
    }),
    item({
      title: "Replay labels",
      detail: `${labels.labelCount || 0} labels · coverage ${formatPct(labels.coverage?.explicitCoverage)} · ${labels.recallReason || "recall available"}`,
      badge: labels.recall === null ? "insufficient" : formatPct(labels.recall),
      status: labels.recall === null ? "hold" : "ok"
    }),
    item({
      title: "Calibration",
      detail: `${calibration.labeledCount || 0} directional outcomes · Brier ${formatNumber(calibration.brierScore, 3)}`,
      badge: calibration.status || "unknown",
      status: calibration.status === "insufficient_labels" ? "hold" : "ok"
    }),
    item({
      title: "Candidate replay",
      detail: `${candidates.signalCount || 0} signals · ${candidates.candidateCount || 0} candidates · ${formatCounts(candidates.abstentionsByReason || {}) || "no abstentions"}`,
      badge: formatPct(candidates.abstentionRate),
      status: candidates.abstentionRate > 0 ? "hold" : "ok"
    }),
    item({
      title: "Regime-aware split",
      detail: `${regimeSplits.bucketCount || 0} buckets · validation coverage ${formatPct(regimeSplits.summary?.validationCoveragePct)}`,
      badge: regimeSplits.status || "unknown",
      status: regimeSplits.status === "passed" ? "ok" : (regimeSplits.status === "blocked" ? "blocked" : "hold")
    }),
    item({
      title: "TCA context",
      detail: `${tca.count || 0} observations · reject-like ${formatPct(tca.rejectLikeRate)} · fill ${formatPct(tca.fillRate)}`,
      badge: tca.count ? "observed" : "missing",
      status: tca.count ? "ok" : "missing"
    }),
    item({
      title: "Replay hashes",
      detail: `run ${replayRun.runHash.slice(0, 12)} · config ${replayRun.configHash.slice(0, 12)} · features ${(snapshots.snapshotHash || "missing").slice(0, 12)}`,
      badge: replayRun.executionAuthority ? "blocked" : "off",
      status: replayRun.executionAuthority ? "blocked" : "ok"
    })
  ].join("");
}

function renderReplayWorkbench() {
  const status = byId("replay-workbench-status");
  if (!status) {
    return;
  }

  const replayRun = state.data.replayRun.replayRun;
  const metrics = state.data.metrics.metrics;
  const comparison = state.data.replayCompare.comparison;
  const regimeSplits = state.data.replaySplits?.split || replayRun.regimeSplits || {};
  const labelCoverage = state.data.replayLabels.labels.coverage || {};
  const leakage = replayRun.leakageChecks || {};
  const snapshots = replayRun.featureSnapshots || {};
  const candidateReplay = replayRun.candidateReplay || {};
  const proposal = metrics.proposalMetrics || {};
  const candidates = metrics.candidateMetrics || {};
  const labels = metrics.replayLabelMetrics || {};
  const tca = metrics.tcaMetrics || {};
  const calibration = proposal.calibration || {};
  const leakageFindings = [
    leakage.futureParentCount,
    leakage.futureCandleCount,
    leakage.futureObservationCount,
    leakage.forbiddenFeatureFieldCount,
    leakage.postDispositionFieldCount
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);

  status.textContent = leakage.ok ? "Causal" : "Blocked";
  status.className = `tag ${tone(leakage.ok ? "ok" : "blocked")}`;

  byId("replay-workbench-list").innerHTML = [
    item({
      title: "Run identity",
      detail: `${replayRun.runHash || "missing"} · config ${replayRun.configHash || "missing"}`,
      badge: replayRun.mode || "local",
      status: replayRun.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Replay scope",
      detail: `${replayRun.eventCount || 0} events · ${(snapshots.snapshotCount || 0)} feature snapshots`,
      badge: replayRun.schema || "proposal_replay",
      status: "ok"
    }),
    item({
      title: "Regime split",
      detail: `${regimeSplits.bucketCount || 0} buckets · ${(regimeSplits.summary?.validationSnapshotCount || 0)} validation snapshots · ${(regimeSplits.splitHash || "missing").slice(0, 12)}`,
      badge: regimeSplits.status || "unknown",
      status: regimeSplits.status === "passed" ? "ok" : (regimeSplits.status === "blocked" ? "blocked" : "hold")
    }),
    item({
      title: "Authority boundary",
      detail: "Replay workbench is read-only and reports derived local replay state.",
      badge: replayRun.executionAuthority ? "blocked" : "off",
      status: replayRun.executionAuthority ? "blocked" : "ok"
    })
  ].join("");

  byId("replay-leakage-list").innerHTML = [
    item({
      title: "Leakage status",
      detail: leakage.reason || "causal replay inputs verified",
      badge: leakage.ok ? "clear" : "blocked",
      status: leakage.ok ? "ok" : "blocked"
    }),
    barRow({
      title: "Leakage findings",
      detail: "future parents, future candles, future observations, forbidden fields, and post-disposition fields",
      value: leakageFindings,
      total: Math.max(leakageFindings, 1),
      status: leakageFindings ? "blocked" : "ok"
    }),
    item({
      title: "Feature snapshots",
      detail: snapshots.snapshotHash || "No feature snapshot hash reported.",
      badge: snapshots.snapshotCount || 0,
      status: snapshots.snapshotCount ? "ok" : "missing"
    }),
    item({
      title: "Forbidden field counts",
      detail: `fields ${leakage.forbiddenFeatureFieldCount || 0} · post-disposition ${leakage.postDispositionFieldCount || 0}`,
      badge: leakage.ok ? "clear" : "review",
      status: leakage.ok ? "ok" : "blocked"
    })
  ].join("");

  byId("replay-candidate-list").innerHTML = [
    item({
      title: "Candidate count",
      detail: `${candidateReplay.candidateCount || 0} replay candidates from ${candidateReplay.signalCount || candidates.signalCount || 0} signals`,
      badge: candidateReplay.candidateCount || candidates.candidateCount || 0,
      status: candidateReplay.candidateCount ? "review" : "missing"
    }),
    barRow({
      title: "Abstention rate",
      detail: formatCounts(candidateReplay.abstentionsByReason || candidates.abstentionsByReason || {}) || "No abstention reason mix reported.",
      value: candidateReplay.abstentionCount || candidates.abstentionCount || 0,
      total: Math.max(candidateReplay.signalCount || candidates.signalCount || 0, candidateReplay.abstentionCount || candidates.abstentionCount || 0, 1),
      status: (candidateReplay.abstentionCount || candidates.abstentionCount) ? "hold" : "ok"
    }),
    item({
      title: "Proposal metrics",
      detail: `precision ${formatPct(proposal.precision)} · false positives ${formatPct(proposal.falsePositiveRate)}`,
      badge: formatPct(proposal.abstentionRate),
      status: "ok"
    }),
    item({
      title: "TCA context",
      detail: `${tca.count || 0} observations · reject-like ${formatPct(tca.rejectLikeRate)} · avg fee ${formatNumber(tca.averageFeeBps, 2)} bps`,
      badge: tca.count ? "observed" : "missing",
      status: tca.count ? "ok" : "missing"
    })
  ].join("");

  byId("replay-delta-list").innerHTML = comparison ? [
    item({
      title: "Comparison hash",
      detail: comparison.comparisonHash || "unavailable",
      badge: comparison.mode || "comparison",
      status: comparison.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Candidate count delta",
      detail: `${comparison.baseline?.candidateCount ?? "--"} baseline -> ${comparison.challenger?.candidateCount ?? "--"} challenger`,
      badge: comparison.delta?.candidateCount ?? "--",
      status: (comparison.delta?.candidateCount || 0) > 0 ? "review" : "ok"
    }),
    item({
      title: "Abstention delta",
      detail: `${formatPct(comparison.baseline?.abstentionRate)} baseline -> ${formatPct(comparison.challenger?.abstentionRate)} challenger`,
      badge: formatPct(comparison.delta?.abstentionRate),
      status: (comparison.delta?.abstentionRate || 0) > 0 ? "warn" : "ok"
    }),
    item({
      title: "Recall delta",
      detail: "explicit replay labels only",
      badge: comparison.delta?.recall === null ? "insufficient" : formatPct(comparison.delta?.recall),
      status: comparison.delta?.recall === null ? "hold" : "ok"
    })
  ].join("") : item({
    title: "No comparison",
    detail: "No baseline/challenger replay comparison is available.",
    badge: "missing",
    status: "missing"
  });

  byId("replay-label-list").innerHTML = [
    item({
      title: "Explicit label coverage",
      detail: `${labelCoverage.explicitPositiveCount || 0} positive · ${labelCoverage.explicitNegativeCount || 0} negative · ${labelCoverage.universeWindowCount || 0} windows`,
      badge: formatPct(labelCoverage.explicitCoverage),
      status: labelCoverage.explicitCoverage > 0 ? "ok" : "missing"
    }),
    item({
      title: "Replay label metrics",
      detail: `${labels.labelCount || 0} labels · ${labels.recallReason || "recall available"}`,
      badge: labels.recall === null ? "insufficient" : formatPct(labels.recall),
      status: labels.recall === null ? "hold" : "ok"
    }),
    item({
      title: "Calibration",
      detail: `${calibration.labeledCount || 0} directional outcomes · ECE ${formatPct(calibration.expectedCalibrationError)}`,
      badge: calibration.status || "unknown",
      status: calibration.status === "insufficient_labels" ? "hold" : "ok"
    }),
    item({
      title: "Brier score",
      detail: "lower is better for calibrated replay outcomes",
      badge: formatNumber(calibration.brierScore, 3),
      status: calibration.brierScore === null || calibration.brierScore === undefined ? "missing" : "ok"
    })
  ].join("");
}

function renderAutonomy() {
  const autonomy = state.data.autonomyStatus.autonomy;
  const policy = state.data.autonomyStatus.policy;
  const paper = state.data.paperPositions.paper;
  const promotion = state.data.autonomyPromotion.promotion;
  const labels = state.data.replayLabels.labels.coverage;
  const query = state.data.queryStatus.queryIndex;
  const queryReadiness = query.readiness || {};
  const queryReadinessDimensions = queryReadiness.dimensions || [];
  const queryReadinessNextChecks = queryReadiness.nextChecks || [];
  const latest = autonomy.latest;

  byId("autonomy-policy-list").innerHTML = [
    item({ title: "Level", detail: "governed autonomy", badge: policy.level || "blocked", status: policy.valid ? "ok" : "blocked" }),
    item({ title: "Policy hash", detail: policy.policyHash || policy.reason || "unavailable", badge: policy.valid ? "valid" : "blocked", status: policy.valid ? "ok" : "blocked" }),
    item({ title: "Live authority", detail: "live execution remains blocked", badge: policy.allowLiveExecution ? "blocked" : "off", status: policy.allowLiveExecution ? "blocked" : "ok" })
  ].join("");

  byId("autonomy-run-list").innerHTML = latest ? [
    item({ title: latest.status, detail: latest.runId, badge: latest.mode, status: latest.status === "completed" ? "ok" : "blocked" }),
    item({ title: "Snapshot events", detail: latest.feedHealthStatus, badge: latest.snapshotsIngested, status: latest.feedHealthStatus }),
    item({ title: "Proposals", detail: latest.replayStatus, badge: latest.proposalsGenerated, status: "review" }),
    item({ title: "Paper openings", detail: latest.completedAt, badge: latest.paperPositionsOpened, status: "ok" })
  ].join("") : item({
    title: "No autonomy run",
    detail: "No autonomous surveillance run is recorded yet.",
    badge: "missing",
    status: "missing"
  });

  byId("paper-list").innerHTML = [
    item({ title: "Open paper positions", detail: "shadow portfolio only", badge: paper.openCount, status: paper.openCount > 0 ? "open" : "ok" }),
    item({ title: "Simulated fills", detail: "paper-only", badge: paper.paperFillCount || 0, status: "ok" }),
    item({ title: "Closed paper positions", detail: `${formatPct(paper.totalPnlPct)} total paper PnL`, badge: paper.closedCount, status: paper.totalPnlPct < 0 ? "warn" : "ok" }),
    item({ title: "Paper drawdown", detail: "policy bounded", badge: formatPct(paper.drawdownPct), status: paper.drawdownPct > 0 ? "warn" : "ok" })
  ].join("");

  byId("promotion-list").innerHTML = Object.entries(promotion.transitions).map(([name, allowed]) => item({
    title: name,
    detail: `policy ${promotion.policyHash}`,
    badge: allowed ? "eligible" : "blocked",
    status: allowed ? "ok" : "blocked"
  })).join("");

  byId("label-coverage-list").innerHTML = [
    item({ title: "Universe windows", detail: "market-signal replay windows", badge: labels.universeWindowCount, status: "ok" }),
    item({ title: "Explicit labels", detail: `${labels.explicitPositiveCount} positive · ${labels.explicitNegativeCount} negative`, badge: labels.explicitLabelCount, status: labels.explicitLabelCount > 0 ? "ok" : "missing" }),
    item({ title: "Coverage", detail: "explicit replay labels", badge: formatPct(labels.explicitCoverage), status: labels.explicitCoverage > 0 ? "ok" : "missing" })
  ].join("");

  byId("query-health-list").innerHTML = [
    item({
      title: "Indexed query readiness",
      detail: `${queryReadinessDimensions.length || 0} dimensions · next checks ${queryReadinessNextChecks.length || 0} · stored query index state, not current provider diagnostics`,
      badge: queryReadiness.status || "unknown",
      status: queryReadiness.status === "passed" ? "ok" : queryReadiness.status === "blocked" ? "blocked" : "warn",
      surface: "indexed-state"
    }),
    item({ title: "Cache", detail: query.sourceOfTruth, badge: query.cachePresent ? "present" : "rebuild", status: query.cachePresent ? "ok" : "warn" }),
    item({ title: "Persistence", detail: query.persistence, badge: query.reconstructable ? "reconstructable" : "blocked", status: query.reconstructable ? "ok" : "blocked" })
  ].join("");
}

function latestLearningComparison() {
  return (state.data.learningComparison.comparison.rows || []).at(-1)?.payload || null;
}

function latestLearningPromotion() {
  return (state.data.learningPromotion.promotion.rows || []).at(-1)?.payload || null;
}

function renderLearning() {
  const status = state.data.learningStatus.learning;
  const latest = state.data.learningLatest.latest || {};
  const profile = latest.profile;
  const run = latest.run || status.latest;
  const comparison = latestLearningComparison();
  const promotion = latestLearningPromotion();

  byId("learning-profile-list").innerHTML = profile ? [
    item({ title: "Profile", detail: profile.profileId, badge: profile.status, status: profile.status === "CANDIDATE" ? "review" : "ok" }),
    item({ title: "Profile hash", detail: profile.profileHash, badge: "hash", status: "ok" }),
    item({ title: "Training data", detail: profile.trainingDataHash, badge: "data", status: "ok" }),
    item({ title: "Validation data", detail: profile.validationDataHash, badge: "data", status: "ok" })
  ].join("") : item({
    title: "No profile",
    detail: "No candidate learning profile is recorded yet.",
    badge: "missing",
    status: "missing"
  });

  byId("learning-run-list").innerHTML = run ? [
    item({ title: run.status, detail: run.runId, badge: run.reason, status: run.status === "completed" ? "ok" : "blocked" }),
    item({ title: "Dataset", detail: run.datasetHash, badge: "hash", status: "ok" }),
    item({ title: "Recommendation", detail: run.profileHash, badge: run.promotionRecommendation, status: run.promotionRecommendation === "NOT_ELIGIBLE" ? "blocked" : "ok" })
  ].join("") : item({
    title: "No run",
    detail: "No learning run is recorded yet.",
    badge: "missing",
    status: "missing"
  });

  byId("learning-comparison-list").innerHTML = comparison ? [
    item({ title: "Leakage", detail: comparison.validationDataHash, badge: comparison.leakageCheck?.passed ? "clear" : "blocked", status: comparison.leakageCheck?.passed ? "ok" : "blocked" }),
    item({ title: "Precision delta", detail: "challenger minus baseline", badge: formatPct(comparison.metrics?.delta?.precision), status: "ok" }),
    item({ title: "Recall delta", detail: "explicit labels only", badge: formatPct(comparison.metrics?.delta?.recall), status: "ok" }),
    item({ title: "Brier delta", detail: "lower is better", badge: formatNumber(comparison.metrics?.delta?.brier, 3), status: comparison.metrics?.delta?.brier <= 0 ? "ok" : "warn" }),
    item({ title: "ECE delta", detail: "lower is better", badge: formatNumber(comparison.metrics?.delta?.ece, 3), status: comparison.metrics?.delta?.ece <= 0 ? "ok" : "warn" }),
    item({ title: "Live eligibility", detail: "always blocked", badge: comparison.eligibleForLive ? "blocked" : "off", status: comparison.eligibleForLive ? "blocked" : "ok" })
  ].join("") : item({
    title: "No comparison",
    detail: "No baseline/challenger comparison is recorded yet.",
    badge: "missing",
    status: "missing"
  });

  byId("learning-split-list").innerHTML = comparison?.splitResults?.length
    ? comparison.splitResults.map((split) => item({
      title: split.splitId,
      detail: `${split.validationRowCount} validation rows`,
      badge: split.passed ? "passed" : "blocked",
      status: split.passed ? "ok" : "blocked"
    })).join("")
    : item({
      title: "No splits",
      detail: "Validation splits are unavailable.",
      badge: "missing",
      status: "missing"
    });

  byId("learning-promotion-list").innerHTML = promotion ? [
    item({ title: "Recommendation", detail: promotion.profileHash, badge: promotion.recommendation, status: promotion.recommendation === "NOT_ELIGIBLE" ? "blocked" : "ok" }),
    item({ title: "Data hash", detail: promotion.dataHash, badge: "hash", status: "ok" }),
    item({ title: "Reasons", detail: (promotion.reasons || []).join(", ") || "none", badge: (promotion.reasons || []).length, status: (promotion.reasons || []).length ? "warn" : "ok" })
  ].join("") : item({
    title: "No promotion report",
    detail: "No advisory learning promotion report is recorded yet.",
    badge: "missing",
    status: "missing"
  });
}

function renderAnalysisStatus() {
  const status = state.data.analysisStatus;
  if (!status || status.ok === false) {
    byId("analysis-status-list").innerHTML = item({
      title: "Status unavailable",
      detail: status?.error || "analysis_status_unavailable",
      badge: "unavailable",
      status: "warn"
    });
    byId("analysis-command-list").innerHTML = "";
    return;
  }

  byId("analysis-status-list").innerHTML = [
    item({ title: "Registry status", detail: `${status.registry.toolCount} tools`, badge: status.registry.status, status: status.registry.status }),
    item({ title: "Missing tools", detail: (status.registry.missingTools || []).join(", ") || "none", badge: (status.registry.missingTools || []).length, status: (status.registry.missingTools || []).length ? "warn" : "ok" }),
    item({ title: "Implementation barrier", detail: "analysis tools remain advisory", badge: status.implementationBarrier.status, status: status.implementationBarrier.status }),
    item({ title: "Risk-gate integrity", detail: status.riskGateIntegrity.integrityPassed ? "integrity checks passed" : "review required", badge: status.riskGateIntegrity.status, status: status.riskGateIntegrity.status }),
    item({ title: "Live execution blocked", detail: "runtime authority remains absent", badge: status.riskGateIntegrity.liveExecutionBlocked ? "yes" : "review", status: status.riskGateIntegrity.liveExecutionBlocked ? "ok" : "blocked" }),
    item({ title: "Patch authority", detail: "analysis tools cannot apply or generate patch output", badge: status.summary.patchAuthorityAbsent ? "absent" : "review", status: status.summary.patchAuthorityAbsent ? "ok" : "blocked" }),
    item({ title: "Advisory-only status", detail: status.summary.allToolsReadOnly ? "read-only inventory" : "review required", badge: status.summary.allToolsAdvisoryOnly ? "yes" : "review", status: status.summary.allToolsAdvisoryOnly ? "ok" : "blocked" })
  ].join("");

  byId("analysis-command-list").innerHTML = (status.recommendedVerificationCommands || []).map((command) => item({
    title: command,
    detail: "local verification command",
    badge: "check",
    status: "ok"
  })).join("");
}

function renderModelBoundary() {
  const health = state.data.health || {};
  const observer = health.observer || {};
  const regime = health.regime || {};
  const learning = health.learning || {};
  const autonomy = health.autonomy || {};
  const policy = autonomy.policy || {};

  byId("model-boundary-list").innerHTML = [
    item({
      title: "Observer",
      detail: `${observer.mode || "unavailable"} · citations ${observer.citationPolicy || "event_ids_only"}`,
      badge: observer.executionAuthority ? "blocked" : "advisory",
      status: observer.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Regime model",
      detail: `${regime.mode || "unavailable"} · calibration ${regime.calibration || "unknown"}`,
      badge: regime.executionAuthority ? "blocked" : "read-only",
      status: regime.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Learning",
      detail: `${learning.mode || "unavailable"} · live execution remains unavailable`,
      badge: learning.executionAuthority ? "blocked" : "dry-run",
      status: learning.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Provider config",
      detail: "No provider/model configuration, secrets, or environment values are displayed in the cinematic operational control room.",
      badge: "hidden",
      status: "ok"
    }),
    item({
      title: "Autonomy policy",
      detail: policy.policyHash || autonomy.mode || "unavailable",
      badge: policy.allowLiveExecution ? "blocked" : "paper-only",
      status: policy.allowLiveExecution ? "blocked" : "ok"
    })
  ].join("");
}

function renderBoundaryAudit() {
  const status = state.data.analysisStatus || {};
  const risk = status.riskGateIntegrity || {};
  const summary = status.summary || {};
  const autonomy = state.data.health?.autonomy || {};
  const policy = autonomy.policy || {};

  byId("boundary-audit-list").innerHTML = [
    item({
      title: "Live authority",
      detail: "Analysis and the cinematic operational control room cannot authorize live execution.",
      badge: risk.liveExecutionBlocked && summary.liveAuthorityAbsent ? "absent" : "review",
      status: risk.liveExecutionBlocked && summary.liveAuthorityAbsent ? "ok" : "blocked"
    }),
    item({
      title: "Signed request path",
      detail: "Request signing remains outside this UI and analysis control plane.",
      badge: risk.signedRequestsAbsent && policy.allowSignedRequests === false ? "absent" : "review",
      status: risk.signedRequestsAbsent && policy.allowSignedRequests === false ? "ok" : "blocked"
    }),
    item({
      title: "Execution routes",
      detail: "No exchange/order route is exposed through the cinematic operational control room.",
      badge: risk.executionRoutesAbsent ? "absent" : "review",
      status: risk.executionRoutesAbsent ? "ok" : "blocked"
    }),
    item({
      title: "Patch authority",
      detail: "Analysis tools cannot apply patches or generate patch output.",
      badge: summary.patchAuthorityAbsent ? "absent" : "review",
      status: summary.patchAuthorityAbsent ? "ok" : "blocked"
    }),
    item({
      title: "Tool mode",
      detail: summary.allToolsReadOnly ? "All registered analysis tools are read-only." : "Analysis registry requires review.",
      badge: summary.allToolsAdvisoryOnly ? "advisory" : "review",
      status: summary.allToolsAdvisoryOnly ? "ok" : "blocked"
    }),
    item({
      title: "Config exposure",
      detail: "Model/provider values stay hidden; only mode, hash, and status surfaces are shown.",
      badge: "minimized",
      status: "ok"
    })
  ].join("");
}

function renderMemoryContext() {
  const memory = state.data.memoryStatus?.memory;
  if (!memory || state.data.memoryStatus.ok === false) {
    byId("memory-context-list").innerHTML = item({
      title: "Memory unavailable",
      detail: state.data.memoryStatus?.error || "memory_context_unavailable",
      badge: "review",
      status: "warn"
    });
    return;
  }

  const manifest = memory.manifest || {};
  const observer = memory.observer || {};
  const citations = observer.citations || {};
  const vector = memory.vectorStore || {};
  const coverage = memory.coverage || {};
  const coverageReadiness = coverage.readiness || {};
  const boundaries = memory.boundaries || {};

  byId("memory-context-list").innerHTML = [
    item({
      title: "Manifest",
      detail: `${manifest.recordCount || 0} memories · ${manifest.invalidRecordCount || 0} invalid · ${(manifest.reportHash || "missing").slice(0, 12)}`,
      badge: manifest.status || "unknown",
      status: manifest.status === "passed" ? "ok" : "blocked"
    }),
    item({
      title: "Observer citations",
      detail: `${citations.citedSummaryCount || 0}/${citations.summaryCount || 0} cited summaries · ${citations.citationCount || 0} event-id citations`,
      badge: citations.allSummariesCited ? "cited" : "review",
      status: citations.allSummariesCited ? "ok" : "blocked"
    }),
    item({
      title: "Memory retrieval",
      detail: `${vector.reason || "retrieval status unavailable"} · ${vector.recordCount || 0} records · external DB ${vector.externalVectorDb ? "on" : "off"}`,
      badge: vector.status || "off",
      status: vector.localDeterministicRetrieval && !vector.externalVectorDb && !vector.persistentIndex && !vector.writeEnabled ? "ok" : "warn"
    }),
    item({
      title: "Coverage context readiness",
      detail: `${formatPct(coverage.runtimeCoveragePct || 0)} runtime coverage · ${coverageReadiness.nextCheckCount || 0} next checks`,
      badge: coverageReadiness.status || coverage.status || "unknown",
      status: coverageReadiness.status === "passed" ? "ok" : coverageReadiness.status === "blocked" ? "blocked" : "warn"
    }),
    item({
      title: "Risk boundary",
      detail: "Memory is context only and cannot unblock risk gates or policy controls.",
      badge: boundaries.canUnblockRiskGates ? "blocked" : "safe",
      status: boundaries.canUnblockRiskGates ? "blocked" : "ok"
    })
  ].join("");
}

function renderMemoryRetrieval() {
  const retrieval = state.data.memoryRetrieval?.retrieval;
  if (!retrieval || state.data.memoryRetrieval.ok === false) {
    byId("memory-retrieval-list").innerHTML = item({
      title: "Retrieval unavailable",
      detail: state.data.memoryRetrieval?.error || "memory_retrieval_unavailable",
      badge: "review",
      status: "warn"
    });
    return;
  }

  const matches = retrieval.matches || [];
  const vector = retrieval.vectorStore || {};
  const readiness = retrieval.readiness || {};
  const readinessChecks = readiness.nextChecks || [];
  const readinessDimensions = readiness.dimensions || [];

  byId("memory-retrieval-list").innerHTML = [
    item({
      title: "Retrieval readiness",
      detail: `${readinessDimensions.length || 0} dimensions · next checks ${readinessChecks.length}`,
      badge: readiness.status || "unknown",
      status: readiness.status === "passed" ? "ok" : readiness.status === "blocked" ? "blocked" : "warn"
    }),
    item({
      title: "Local vector boundary",
      detail: `${vector.recordCount || 0} cited memories · ${vector.uniqueTokenCount || 0} unique local tokens`,
      badge: vector.externalVectorDb ? "review" : "local",
      status: vector.externalVectorDb ? "blocked" : "ok"
    }),
    item({
      title: "Query",
      detail: retrieval.query?.text || "default query",
      badge: (retrieval.query?.tokens || []).length,
      status: "ok"
    }),
    ...matches.map((match) => item({
      title: match.title,
      detail: `${match.memoryType} · score ${formatNumber(match.score, 3)} · evidence ${(match.evidenceIds || []).join(", ") || "none"}`,
      badge: match.confidence || "memory",
      status: match.score > 0 ? "ok" : "warn"
    })),
    item({
      title: "Write boundary",
      detail: "Retrieval is deterministic and does not write files, audit, evidence, or external vector indexes.",
      badge: vector.writeEnabled ? "blocked" : "read-only",
      status: vector.writeEnabled ? "blocked" : "ok"
    })
  ].join("");
}

function renderMemoryCoverage() {
  const coverage = state.data.memoryCoverage?.coverage;
  if (!coverage || state.data.memoryCoverage.ok === false) {
    byId("memory-coverage-list").innerHTML = item({
      title: "Coverage unavailable",
      detail: state.data.memoryCoverage?.error || "memory_coverage_unavailable",
      badge: "review",
      status: "warn"
    });
    return;
  }

  const summary = coverage.summary || {};
  const readiness = coverage.readiness || {};
  const readinessDimensions = readiness.dimensions || [];
  const readinessNextChecks = readiness.nextChecks || [];
  const missingEvidence = summary.missingEvidenceIds || [];
  const missingSource = summary.missingSourceEventIds || [];

  byId("memory-coverage-list").innerHTML = [
    item({
      title: "Coverage readiness",
      detail: `${readinessDimensions.length || 0} dimensions · next checks ${readinessNextChecks.length || 0}`,
      badge: readiness.status || "unknown",
      status: readiness.status === "passed" ? "ok" : readiness.status === "blocked" ? "blocked" : "warn"
    }),
    item({
      title: "Runtime citation coverage",
      detail: `${formatPct(summary.runtimeCoveragePct || 0)} present in current evidence/audit stores`,
      badge: coverage.conclusion?.status || "unknown",
      status: coverage.conclusion?.status === "passed" ? "ok" : "warn"
    }),
    item({
      title: "Evidence ids",
      detail: `${summary.presentEvidenceIdCount || 0}/${summary.referencedEvidenceIdCount || 0} present · missing ${missingEvidence.slice(0, 2).join(", ") || "none"}`,
      badge: summary.missingEvidenceIdCount || 0,
      status: summary.missingEvidenceIdCount ? "warn" : "ok"
    }),
    item({
      title: "Source event ids",
      detail: `${summary.presentSourceEventIdCount || 0}/${summary.referencedSourceEventIdCount || 0} present · missing ${missingSource.slice(0, 2).join(", ") || "none"}`,
      badge: summary.missingSourceEventIdCount || 0,
      status: summary.missingSourceEventIdCount ? "warn" : "ok"
    }),
    item({
      title: "Authority boundary",
      detail: "Coverage is diagnostic only and cannot unblock risk gates, mutate evidence, or authorize live execution.",
      badge: coverage.executionAuthority ? "blocked" : "read-only",
      status: coverage.executionAuthority ? "blocked" : "ok"
    })
  ].join("");
}

function renderHandoffSummary() {
  const handoff = state.data.handoffSummary?.handoff;
  if (!handoff || state.data.handoffSummary.ok === false) {
    byId("handoff-summary-list").innerHTML = item({
      title: "Handoff unavailable",
      detail: state.data.handoffSummary?.error || "handoff_summary_unavailable",
      badge: "review",
      status: "warn"
    });
    return;
  }

  const verification = handoff.verification || {};
  const currentMap = handoff.currentMap || {};
  const files = handoff.sourceFiles || [];
  const missingFiles = files.filter((file) => !file.exists);
  const narrative = handoff.narrative || {};
  const continuityChecks = handoff.continuityChecks || [];
  const continuity = handoff.continuitySummary || {};
  const checkTone = continuity.blocked ? "blocked" : continuity.review ? "warn" : "ok";

  byId("handoff-summary-list").innerHTML = [
    item({
      title: "Narrative",
      detail: narrative.headline || "No generated handoff narrative available.",
      badge: handoff.conclusion?.status || "unknown",
      status: handoff.conclusion?.status || "warn"
    }),
    item({
      title: "Current phase",
      detail: currentMap["Active phase"] || "phase unavailable",
      badge: handoff.roadmap?.overall || currentMap["Overall roadmap status"] || "unknown",
      status: handoff.conclusion?.status || "warn"
    }),
    item({
      title: "Latest verify",
      detail: verification.available ? `${verification.label} · tests ${verification.tests} · pass ${verification.pass} · fail ${verification.fail}` : "No latest verify block found.",
      badge: verification.verifyOk ? "ok" : "missing",
      status: verification.verifyOk && verification.fail === 0 ? "ok" : "blocked"
    }),
    item({
      title: "Continuity checks",
      detail: compactList(continuityChecks.slice(0, 4).map((check) => `${check.checkId}:${check.status}`), "No continuity checks listed."),
      badge: `${continuity.passed || 0}/${continuity.total || continuityChecks.length || 0}`,
      status: checkTone
    }),
    item({
      title: "Source files",
      detail: `${files.length} handoff source files · missing ${missingFiles.length}`,
      badge: missingFiles.length ? "review" : "complete",
      status: missingFiles.length ? "warn" : "ok"
    }),
    item({
      title: "Boundary",
      detail: narrative.safetyBoundary || "Handoff reads current repo docs/package only and cannot mutate files or authorize live execution.",
      badge: handoff.executionAuthority ? "blocked" : "read-only",
      status: handoff.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Next plan",
      detail: compactList((handoff.roadmap?.immediatePlan || []).slice(0, 3), "No immediate plan listed."),
      badge: handoff.roadmap?.immediatePlan?.length || 0,
      status: "review"
    }),
    item({
      title: "Summary hash",
      detail: handoff.summaryHash || "missing",
      badge: handoff.conclusion?.status || "unknown",
      status: handoff.conclusion?.status || "warn"
    })
  ].join("");
}

function renderThinkingSummary() {
  const thinking = state.data.thinkingSummary?.thinking;
  if (!thinking || state.data.thinkingSummary.ok === false) {
    byId("thinking-summary-list").innerHTML = item({
      title: "Thinking unavailable",
      detail: state.data.thinkingSummary?.error || "thinking_summary_unavailable",
      badge: "review",
      status: "warn"
    });
    return;
  }

  const steps = thinking.steps || [];
  const nextChecks = thinking.nextChecks || [];
  const blocked = steps.filter((step) => step.status === "blocked").length;
  const review = steps.filter((step) => step.status === "review").length;
  const topChecks = nextChecks.slice(0, 3).map((check) => check.checkId).join(", ") || "none";

  byId("thinking-summary-list").innerHTML = [
    item({
      title: "Visible rationale",
      detail: `${steps.length} reasoning steps · blocked ${blocked} · review ${review}`,
      badge: thinking.conclusion?.status || "unknown",
      status: thinking.conclusion?.status || "warn"
    }),
    item({
      title: "Data quality",
      detail: steps.find((step) => step.stepId === "data_quality_gate")?.reason || "No data-quality step reported.",
      badge: steps.find((step) => step.stepId === "data_quality_gate")?.status || "unknown",
      status: steps.find((step) => step.stepId === "data_quality_gate")?.status || "warn"
    }),
    item({
      title: "Source drift",
      detail: steps.find((step) => step.stepId === "source_drift_gate")?.reason || "No source-drift step reported.",
      badge: steps.find((step) => step.stepId === "source_drift_gate")?.status || "unknown",
      status: steps.find((step) => step.stepId === "source_drift_gate")?.status || "warn"
    }),
    item({
      title: "Live boundary",
      detail: steps.find((step) => step.stepId === "live_readiness_gate")?.reason || "Live-readiness step unavailable.",
      badge: thinking.executionAuthority ? "blocked" : "off",
      status: thinking.executionAuthority ? "blocked" : "ok"
    }),
    item({
      title: "Next checks",
      detail: topChecks,
      badge: nextChecks.length,
      status: nextChecks.length ? "review" : "ok"
    }),
    item({
      title: "Trace boundary",
      detail: "Shows evidence-backed reasons, not hidden model trace or execution authority.",
      badge: thinking.hiddenReasoningExposed ? "review" : "safe",
      status: thinking.hiddenReasoningExposed ? "blocked" : "ok"
    })
  ].join("");
}

function renderAnalysisDrilldown() {
  const status = state.data.analysisStatus || {};
  const registry = status.registry || {};
  const barrier = status.implementationBarrier || {};
  const risk = status.riskGateIntegrity || {};
  const summary = status.summary || {};
  const commands = status.recommendedVerificationCommands || [];

  byId("analysis-drilldown-list").innerHTML = [
    item({
      title: "Registry coverage",
      detail: `${registry.toolCount || 0} tools registered · missing ${(registry.missingTools || []).join(", ") || "none"}`,
      badge: registry.status || "unavailable",
      status: registry.status || "warn"
    }),
    barRow({
      title: "Safe authority flags",
      detail: "read-only, advisory-only, no live authority, no patch authority",
      value: [
        summary.allToolsReadOnly,
        summary.allToolsAdvisoryOnly,
        summary.liveAuthorityAbsent,
        summary.patchAuthorityAbsent
      ].filter(Boolean).length,
      total: 4,
      status: summary.analysisControlPlanePassed ? "ok" : "blocked"
    }),
    item({
      title: "Risk-gate proof",
      detail: `live ${risk.liveExecutionBlocked ? "blocked" : "review"} · signed requests ${risk.signedRequestsAbsent ? "absent" : "review"} · routes ${risk.executionRoutesAbsent ? "absent" : "review"}`,
      badge: risk.integrityPassed ? "passed" : "review",
      status: risk.integrityPassed ? "ok" : "blocked"
    }),
    item({
      title: "Implementation barrier",
      detail: `apply ${barrier.canApplyPatch ? "review" : "absent"} · generate ${barrier.canGeneratePatch ? "review" : "absent"} · deploy ${barrier.canDeploy ? "review" : "absent"} · policy ${barrier.canModifyPolicy ? "review" : "absent"}`,
      badge: barrier.status || "unavailable",
      status: barrier.status || "warn"
    }),
    item({
      title: "Provider visibility",
      detail: "The cinematic operational control room surfaces mode, status, hash, and boundary facts only; sensitive provider configuration stays hidden.",
      badge: "minimized",
      status: "ok"
    }),
    item({
      title: "Verification commands",
      detail: compactList(commands, "No recommended verification commands reported."),
      badge: commands.length,
      status: commands.length ? "ok" : "missing"
    })
  ].join("");
}

function renderFeedSnapshots() {
  const snapshots = state.data.queryFeedHealth.feedHealth.snapshots || [];
  byId("feed-snapshot-list").innerHTML = snapshots.length
    ? snapshots.slice().reverse().map((snapshot) => item({
      title: `${snapshot.venue || "UNKNOWN"} ${snapshot.symbol || snapshot.source}`,
      detail: `${snapshot.source} · ${snapshot.latestObservedAt || snapshot.checkedAt}`,
      badge: snapshot.status,
      status: snapshot.status
    })).join("")
    : item({
      title: "No feed snapshots",
      detail: "No feed-health evidence is indexed yet.",
      badge: "missing",
      status: "missing"
    });
}

function renderFeedTrend() {
  const snapshots = state.data.queryFeedHealth.feedHealth.snapshots || [];
  const currentFeeds = state.data.feedHealth.feedHealth.feeds || [];
  const statusCounts = snapshots.reduce((acc, snapshot) => {
    const status = snapshot.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const bySource = snapshots.reduce((acc, snapshot) => {
    const source = snapshot.source || snapshot.venue || "unknown";
    const row = acc.get(source) || {
      source,
      total: 0,
      degraded: 0,
      latest: snapshot
    };
    row.total += 1;
    if (!["healthy", "reference", "ok", "operational"].includes(String(snapshot.status || "").toLowerCase())) {
      row.degraded += 1;
    }
    if (Date.parse(snapshot.latestObservedAt || snapshot.checkedAt || 0) > Date.parse(row.latest.latestObservedAt || row.latest.checkedAt || 0)) {
      row.latest = snapshot;
    }
    acc.set(source, row);
    return acc;
  }, new Map());
  const sourceRows = [...bySource.values()]
    .sort((a, b) => b.degraded - a.degraded || b.total - a.total || a.source.localeCompare(b.source))
    .slice(0, 4);
  const statusMix = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([status, count]) => `${status}:${count}`)
    .join(" · ") || "no snapshots";
  const statusBars = Object.entries(statusCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  byId("feed-trend-list").innerHTML = [
    item({
      title: "Snapshot coverage",
      detail: `${snapshots.length} indexed snapshots · ${currentFeeds.length} current feed rows`,
      badge: snapshots.length ? "indexed" : "missing",
      status: snapshots.length ? "ok" : "missing"
    }),
    item({
      title: "Status mix",
      detail: statusMix,
      badge: Object.keys(statusCounts).length,
      status: statusCounts.degraded || statusCounts.stale || statusCounts.unavailable ? "warn" : "ok"
    }),
    ...statusBars.map(([status, count]) => barRow({
      title: status,
      detail: "share of indexed feed-health snapshots",
      value: count,
      total: snapshots.length,
      status
    })),
    ...sourceRows.map((row) => item({
      title: row.source,
      detail: `${row.total} snapshots · latest ${row.latest.latestObservedAt || row.latest.checkedAt || "unknown"}`,
      badge: row.degraded ? `${row.degraded} degraded` : "clear",
      status: row.degraded ? "warn" : "ok"
    }))
  ].join("");
}

function renderFeedDegradation() {
  const feedHealth = state.data.feedHealth.feedHealth;
  const diagnostics = diagnosticsReport();
  const diagnosticsCard = diagnosticsNarrative(diagnostics);
  const snapshots = state.data.queryFeedHealth.feedHealth.snapshots || [];
  const currentFeeds = feedHealth.feeds || [];
  const degradedFeeds = currentFeeds.filter((feed) => !["healthy", "reference", "ok", "operational"].includes(String(feed.status || "").toLowerCase()));
  const bySource = snapshots.reduce((acc, snapshot) => {
    const source = snapshot.source || snapshot.venue || "unknown";
    const row = acc.get(source) || {
      source,
      total: 0,
      degraded: 0,
      latest: snapshot,
      statuses: {}
    };
    const status = String(snapshot.status || "unknown").toLowerCase();
    row.total += 1;
    row.statuses[status] = (row.statuses[status] || 0) + 1;
    if (!["healthy", "reference", "ok", "operational"].includes(status)) {
      row.degraded += 1;
    }
    if (Date.parse(snapshot.latestObservedAt || snapshot.checkedAt || 0) > Date.parse(row.latest.latestObservedAt || row.latest.checkedAt || 0)) {
      row.latest = snapshot;
    }
    acc.set(source, row);
    return acc;
  }, new Map());
  const sourceRows = [...bySource.values()]
    .sort((left, right) => right.degraded - left.degraded || right.total - left.total || left.source.localeCompare(right.source))
    .slice(0, 5);

  byId("feed-degradation-list").innerHTML = [
    item({
      title: "Current feed state",
      detail: `${currentFeeds.length} current feed rows · ${degradedFeeds.length} degraded · thresholds ${formatNumber(feedHealth.thresholds?.degradedAfterMs / 3600000, 1)}h degraded / ${formatNumber(feedHealth.thresholds?.staleAfterMs / 3600000, 1)}h stale`,
      badge: feedHealth.overallStatus || "unknown",
      status: feedHealth.overallStatus || "warn"
    }),
    item(diagnosticsCard),
    item({
      title: "Data quality",
      detail: `${feedHealth.totals?.qualityErrors || 0} errors · ${feedHealth.totals?.qualityWarnings || 0} warnings · ${(feedHealth.feeds || []).filter((feed) => feed.quality?.issueCount > 0).map((feed) => `${feed.source}:${feed.quality.issueCodes.join("/")}`).join(" · ") || "no current quality issues"}`,
      badge: feedHealth.qualityStatus || "unknown",
      status: feedHealth.qualityStatus === "error" ? "warn" : feedHealth.qualityStatus || "ok"
    }),
    barRow({
      title: "Degraded share",
      detail: degradedFeeds.map((feed) => `${feed.source}:${feed.status}`).join(" · ") || "No degraded current feed rows.",
      value: degradedFeeds.length,
      total: currentFeeds.length,
      status: degradedFeeds.length ? "warn" : "ok"
    }),
    ...sourceRows.map((row) => barRow({
      title: row.source,
      detail: `${formatCounts(row.statuses)} · latest ${row.latest.latestObservedAt || row.latest.checkedAt || "unknown"}`,
      value: row.degraded,
      total: row.total,
      status: row.degraded ? "warn" : "ok"
    })),
    item({
      title: "Evidence source mix",
      detail: formatCounts(feedHealth.eventTypes || {}) || "No event type mix reported.",
      badge: feedHealth.totals?.events || 0,
      status: feedHealth.totals?.events ? "ok" : "missing"
    })
  ].join("");
}

function renderPublicContext() {
  const context = state.data.publicContext.context || {};
  const diagnostics = diagnosticsReport();
  const diagnosticsCard = diagnosticsNarrative(diagnostics);
  const topMarkets = context.topMarkets || [];
  const sentiment = context.latestSentiment || {};

  byId("market-context-list").innerHTML = [
    item({
      title: "Adapter boundary",
      detail: `${context.sourceCount || 0} sources · ${context.eventCount || 0} normalized events · fixture ${context.fixtureBacked ? "yes" : "no"} · ${context.liveNetworkEnabled ? "network on" : "network off"}`,
      badge: context.liveNetworkEnabled ? "network" : "offline",
      status: context.liveNetworkEnabled ? "warn" : "ok"
    }),
    item(diagnosticsCard),
    item({
      title: "Fear & Greed",
      detail: `${sentiment.classification || "Unknown"} · score ${sentiment.score ?? "--"} · ${sentiment.observedAt || "no timestamp"}`,
      badge: sentiment.bucket || "missing",
      status: sentiment.bucket ? "ok" : "missing"
    }),
    ...topMarkets.slice(0, 3).map((market) => item({
      title: `${market.symbol} public context`,
      detail: `rank ${market.marketCapRank ?? "--"} · price ${formatNumber(market.price, 2)} · 24h ${formatNumber(market.priceChange24hPct, 2)}%`,
      badge: market.priceChange24hPct >= 0 ? "up" : "down",
      status: market.priceChange24hPct >= 0 ? "ok" : "warn"
    })),
    item({
      title: "Authority boundary",
      detail: `executionAuthority ${String(context.executionAuthority)} · hash ${context.reportHash || "missing"}`,
      badge: context.executionAuthority === false ? "advisory" : "check",
      status: context.executionAuthority === false ? "ok" : "warn"
    })
  ].join("");
}

function renderObserver() {
  const summaries = state.data.observer.observer.summaries || [];
  byId("observer-list").innerHTML = summaries.length
    ? summaries.map((summary) => item({
      title: summary.title,
      detail: `${summary.detail} · ${summary.citations.join(", ")}`,
      badge: summary.severity,
      status: summary.severity
    })).join("")
    : item({
      title: "No summaries",
      detail: "No cited observer summaries are available.",
      badge: "empty",
      status: ""
    });
}

function renderObserverDiagnostics() {
  const diagnostics = state.data.observerDiagnostics?.diagnostics;
  if (!diagnostics || state.data.observerDiagnostics.ok === false) {
    byId("observer-diagnostics-list").innerHTML = item({
      title: "Diagnostics unavailable",
      detail: state.data.observerDiagnostics?.error || "observer_diagnostics_unavailable",
      badge: "review",
      status: "warn"
    });
    return;
  }

  const quality = diagnostics.dataQuality || {};
  const drift = diagnostics.sourceDrift || {};
  const readiness = diagnostics.readiness || {};
  const sources = diagnostics.sources || [];
  const staleSources = sources.filter((source) => source.staleAgainstNewest);
  const topIssue = (diagnostics.issueTrends || [])[0];
  const latestBucket = [...(diagnostics.timeBuckets || [])].sort((left, right) => right.bucket.localeCompare(left.bucket))[0];
  const readinessChecks = readiness.nextChecks || [];
  const readinessDimensions = readiness.dimensions || [];

  byId("observer-diagnostics-list").innerHTML = [
    item({
      title: "Observer readiness",
      detail: `${readinessDimensions.length || 0} dimensions · next checks ${readinessChecks.length}`,
      badge: readiness.status || "unknown",
      status: readiness.status === "passed" ? "ok" : readiness.status === "blocked" ? "blocked" : "warn"
    }),
    item({
      title: "Data quality trend",
      detail: `${quality.issueCount || 0} issues · errors ${quality.errorCount || 0} · warnings ${quality.warningCount || 0}`,
      badge: quality.status || "unknown",
      status: quality.status === "ok" ? "ok" : "warn"
    }),
    item({
      title: "Source drift",
      detail: `${drift.sourceCount || 0} sources · spread ${formatNumber((drift.driftMs || 0) / 3600000, 1)}h · stale ${staleSources.length}`,
      badge: drift.status || "unknown",
      status: drift.status === "ok" ? "ok" : "warn"
    }),
    item({
      title: "Top issue",
      detail: topIssue ? `${topIssue.code} · ${topIssue.count} hits · ${(topIssue.citations || []).join(", ")}` : "No data-quality issues detected.",
      badge: topIssue?.severity || "none",
      status: topIssue ? topIssue.severity : "ok"
    }),
    item({
      title: "Latest bucket",
      detail: latestBucket ? `${latestBucket.bucket} · ${latestBucket.eventCount} events · ${latestBucket.sourceCount} sources` : "No time buckets available.",
      badge: latestBucket?.issueCount || 0,
      status: latestBucket?.issueCount ? "warn" : "ok"
    }),
    item({
      title: "Authority boundary",
      detail: "Diagnostics cite event IDs only and cannot mutate evidence, call providers, or authorize live execution.",
      badge: diagnostics.executionAuthority ? "blocked" : "read-only",
      status: diagnostics.executionAuthority ? "blocked" : "ok"
    })
  ].join("");
}

function renderControls() {
  const readiness = state.data.readiness.liveReadiness;
  const controlGaps = readiness.controlGaps || {};
  const readinessGuidance = readiness.guidance || {};
  const nextProof = (readinessGuidance.nextProofs || [])[0];
  const killSwitches = state.data.killSwitches.killSwitches;
  const manualCloseStatus = state.data.health.manualCloseWorkflow || {};
  const manualCloseWorkflow = state.data.manualCloseWorkflow.workflow || {};
  const manualCloseRows = manualCloseWorkflow.workflows || [];
  const positionSizing = state.data.positionSizing.sizing || {};
  const venueStatus = state.data.venueStatus.venueStatus;
  const reliability = state.data.venueReliability.reliability || {};
  const reconciliation = state.data.reconciliation.reconciliation;

  byId("control-list").innerHTML = readiness.controls.map((control) => item({
    title: control.controlId,
    detail: control.reason,
    badge: control.status,
    status: control.status
  })).join("");
  const gapRows = [
    item({
      title: "Report boundary",
      detail: `${controlGaps.schema || "live_readiness_control_gaps_v1"} · missing ${(controlGaps.missing || []).length} · partial ${(controlGaps.partial || []).length}`,
      badge: readiness.liveExecutionAllowed ? "review" : "blocked by policy",
      status: readiness.liveExecutionAllowed ? "blocked" : "ok"
    }),
    item({
      title: "Readiness guidance",
      detail: `${readinessGuidance.schema || "live_readiness_guidance_v1"} · blockers ${readinessGuidance.totals?.blocking || 0} · critical ${readinessGuidance.totals?.criticalBlocking || 0}`,
      badge: readinessGuidance.status || "blocked",
      status: readinessGuidance.status || "blocked"
    }),
    item({
      title: "Owner surfaces",
      detail: formatCounts(readinessGuidance.ownerSurfaceCounts || {}) || "No owner-surface blockers are mapped.",
      badge: Object.keys(readinessGuidance.ownerSurfaceCounts || {}).length,
      status: Object.keys(readinessGuidance.ownerSurfaceCounts || {}).length ? "warn" : "ok"
    }),
    item({
      title: "Next proof",
      detail: nextProof ? `${nextProof.requiredProof} -> ${nextProof.nextStep}` : "No mapped proof remains; live still blocked by policy.",
      badge: nextProof?.controlId || "policy",
      status: nextProof ? "blocked" : "ok"
    }),
    ...(controlGaps.nextControls || []).map((gap) => item({
      title: gap.controlId,
      detail: `${gap.reason} -> ${gap.nextStep}`,
      badge: gap.status,
      status: gap.status
    }))
  ];
  byId("control-gap-list").innerHTML = gapRows.length
    ? gapRows.join("")
    : item({
      title: "No mapped control gaps",
      detail: "Live remains blocked by policy even if every control is implemented.",
      badge: "blocked by policy",
      status: "ok"
    });
  byId("kill-switch-list").innerHTML = killSwitches.controls.map((control) => item({
    title: control.controlType,
    detail: control.current?.reason || control.controlId,
    badge: control.current?.status || "missing",
    status: control.current?.status || "missing"
  })).join("");
  byId("manual-close-list").innerHTML = [
    item({
      title: "Workflow coverage",
      detail: `${manualCloseWorkflow.count || 0} close recommendation workflow records indexed`,
      badge: manualCloseStatus.executionAuthority === false ? "manual only" : "check",
      status: manualCloseStatus.executionAuthority === false ? "ok" : "warn"
    }),
    item({
      title: "Allowed dispositions",
      detail: compactList(manualCloseStatus.allowedDispositions || [], "No disposition list reported."),
      badge: manualCloseStatus.schema || "missing",
      status: manualCloseStatus.allowedDispositions?.length ? "ok" : "missing"
    }),
    item({
      title: "Allowed lifecycle states",
      detail: compactList(manualCloseStatus.allowedLifecycleStatuses || [], "No lifecycle-state list reported."),
      badge: "manual transition",
      status: manualCloseStatus.allowedLifecycleStatuses?.length ? "ok" : "missing"
    }),
    ...manualCloseRows.slice(0, 4).map((workflow) => {
      const recommendation = workflow.recommendation || {};
      const latestDisposition = (workflow.dispositions || []).at(-1);
      const transitions = workflow.lifecycleTransitions || [];
      return item({
        title: recommendation.recommendationId || recommendation.positionId || "close recommendation",
        detail: `${workflow.dispositions?.length || 0} dispositions · ${transitions.length} lifecycle transitions`,
        badge: latestDisposition?.disposition || recommendation.recommendationType || "pending",
        status: latestDisposition?.disposition === "MANUAL_CLOSE_APPROVED" ? "review" : latestDisposition ? "hold" : "missing"
      });
    })
  ].join("");
  byId("position-sizing-list").innerHTML = [
    item({
      title: "Calculator boundary",
      detail: `${positionSizing.mode || "manual_review_position_sizing"} · canPlaceOrders ${String(positionSizing.canPlaceOrders)}`,
      badge: positionSizing.executionAuthority === false ? "advisory" : "check",
      status: positionSizing.executionAuthority === false ? "ok" : "warn"
    }),
    item({
      title: "Sample size",
      detail: `qty ${formatNumber(positionSizing.sizing?.quantity, 4)} · notional ${formatNumber(positionSizing.sizing?.notionalUsd, 2)} · margin ${formatNumber(positionSizing.sizing?.marginUsd, 2)}`,
      badge: positionSizing.status || "missing",
      status: positionSizing.accepted ? "ok" : "missing"
    }),
    item({
      title: "Risk result",
      detail: `max loss ${formatNumber(positionSizing.sizing?.maxLossUsd, 2)} · effective risk ${formatNumber(positionSizing.sizing?.effectiveRiskPct, 2)}%`,
      badge: (positionSizing.warnings || []).join(", ") || "clear",
      status: (positionSizing.warnings || []).length ? "warn" : "ok"
    })
  ].join("");
  byId("venue-list").innerHTML = venueStatus.latest.length
    ? venueStatus.latest.map((status) => item({
      title: `${status.venue} ${status.component}`,
      detail: status.reason || status.source,
      badge: status.status,
      status: status.status
    })).join("")
    : item({ title: "No venue status", detail: "No venue component evidence recorded.", badge: "missing", status: "missing" });
  byId("venue-reliability-list").innerHTML = (reliability.venues || []).length
    ? [
      item({
        title: "Overall reliability",
        detail: `${reliability.venueCount || 0} venues · ${formatCounts(reliability.statusCounts || {})}`,
        badge: reliability.overallStatus || "UNKNOWN",
        status: reliability.overallStatus || "UNKNOWN"
      }),
      ...(reliability.venues || []).slice(0, 4).map((venue) => item({
        title: venue.venue,
        detail: `${venue.marketEventCount || 0} market events · ${venue.reasons.join(", ") || "no active reliability issues"}`,
        badge: `${venue.status} ${formatPct(venue.confidence)}`,
        status: venue.status
      }))
    ].join("")
    : item({
      title: "No reliability model",
      detail: "No venue evidence is available for reliability scoring.",
      badge: "missing",
      status: "missing"
    });
  byId("reconciliation-list").innerHTML = reconciliation.latest.length
    ? reconciliation.latest.map((check) => item({
      title: `${check.venue} ${check.checkId}`,
      detail: `${check.issueCount} issues`,
      badge: check.status,
      status: check.status
    })).join("")
    : item({ title: "No checks", detail: "No reconciliation checks recorded.", badge: "missing", status: "missing" });
}

function renderDispositionKit() {
  const selection = selectedProposal();
  const proposal = selection?.proposal;
  const risk = selection?.risk || {};
  const manualCloseStatus = state.data.health.manualCloseWorkflow || {};
  const manualCloseWorkflow = state.data.manualCloseWorkflow.workflow || {};
  const allowedDispositions = manualCloseStatus.allowedDispositions || [];
  const allowedLifecycleStates = manualCloseStatus.allowedLifecycleStatuses || state.data.health.positionLifecycle?.allowedStatuses || [];
  const evidenceIds = proposal?.evidenceIds || [];
  const reviewEvents = reviewEventsForProposal(proposal);
  const latestReview = reviewEvents.at(-1);

  byId("disposition-kit-list").innerHTML = [
    item({
      title: proposal?.proposalId || "No selected proposal",
      detail: proposal ? `${proposal.symbol || "UNKNOWN"} ${proposal.side || ""} · ${proposal.venue || "unknown venue"} · evidence ids ${evidenceIds.length}` : "Select a proposal in Queue or Brief to populate the manual review kit.",
      badge: proposal ? selection.kind : "empty",
      status: proposal ? "review" : "missing"
    }),
    item({
      title: "Review readiness",
      detail: risk.reviewEligible ? "Risk gate permits manual review recording." : (risk.reason || "Risk gate state unavailable."),
      badge: risk.reviewEligible ? "eligible" : "held",
      status: risk.reviewEligible ? "review" : "hold"
    }),
    item({
      title: "Outcome checklist",
      detail: `Allowed outcomes: ${ALLOWED_MANUAL_OUTCOMES.join(", ")}. Require proposal id, reviewer, and notes before recording.`,
      badge: "manual",
      status: "ok"
    }),
    item({
      title: "Close disposition checklist",
      detail: compactList(allowedDispositions, "No close dispositions reported by health status."),
      badge: manualCloseStatus.executionAuthority === false ? "no authority" : "review",
      status: manualCloseStatus.executionAuthority === false ? "ok" : "warn"
    }),
    item({
      title: "Lifecycle checklist",
      detail: compactList(allowedLifecycleStates, "No lifecycle states reported by health status."),
      badge: "parent-linked",
      status: allowedLifecycleStates.length ? "ok" : "missing"
    }),
    item({
      title: "Local audit context",
      detail: latestReview ? `${reviewEvents.length} review dispositions for selected proposal · latest ${latestReview.observedAt || "timestamp unavailable"}` : `${manualCloseWorkflow.count || 0} manual-close workflows indexed locally.`,
      badge: latestReview?.payload?.outcome || latestReview?.payload?.disposition || reviewEvents.length || "none",
      status: latestReview ? "ok" : "missing"
    })
  ].join("");
}

async function loadDashboard() {
  const [
    health,
    readiness,
    candidates,
    evidence,
    queryProposals,
    queryStatus,
    queryFeedHealth,
    reviewIntelligence,
    replayLabels,
    replayCompare,
    replaySplits,
    autonomyStatus,
    autonomyPromotion,
    paperPositions,
    positionSizing,
    learningStatus,
    learningLatest,
    learningComparison,
    learningPromotion,
    feedHealth,
    feedDiagnostics,
    publicContext,
    regime,
    observer,
    observerDiagnostics,
    killSwitches,
    exitPolicy,
    manualCloseWorkflow,
    venueStatus,
    venueReliability,
    reconciliation,
    tcaSummary,
    lifecycleSummary,
    metrics,
    replayRun,
    memoryStatus,
    memoryRetrieval,
    memoryCoverage,
    handoffSummary,
    thinkingSummary,
    analysisStatus
  ] = await Promise.all([
    getJson(endpoints.health),
    getJson(endpoints.readiness),
    getJson(endpoints.candidates),
    getJson(endpoints.evidence),
    getJson(endpoints.queryProposals),
    getJson(endpoints.queryStatus),
    getJson(endpoints.queryFeedHealth),
    getJson(endpoints.reviewIntelligence),
    getJson(endpoints.replayLabels),
    getJson(endpoints.replayCompare),
    getJson(endpoints.replaySplits),
    getJson(endpoints.autonomyStatus),
    getJson(endpoints.autonomyPromotion),
    getJson(endpoints.paperPositions),
    getJson(endpoints.positionSizing),
    getJson(endpoints.learningStatus),
    getJson(endpoints.learningLatest),
    getJson(endpoints.learningComparison),
    getJson(endpoints.learningPromotion),
    getJson(endpoints.feedHealth),
    getOptionalJson(endpoints.feedDiagnostics),
    getJson(endpoints.publicContext),
    getJson(endpoints.regime),
    getJson(endpoints.observer),
    getOptionalJson(endpoints.observerDiagnostics),
    getJson(endpoints.killSwitches),
    getOptionalJson(endpoints.exitPolicy),
    getJson(endpoints.manualCloseWorkflow),
    getJson(endpoints.venueStatus),
    getJson(endpoints.venueReliability),
    getJson(endpoints.reconciliation),
    getOptionalJson(endpoints.tcaSummary),
    getOptionalJson(endpoints.lifecycleSummary),
    getJson(endpoints.metrics),
    getJson(endpoints.replayRun),
    getOptionalJson(endpoints.memoryStatus),
    getOptionalJson(endpoints.memoryRetrieval),
    getOptionalJson(endpoints.memoryCoverage),
    getOptionalJson(endpoints.handoffSummary),
    getOptionalJson(endpoints.thinkingSummary),
    getOptionalJson(endpoints.analysisStatus)
  ]);

  state.data = { health, readiness, candidates, evidence, queryProposals, queryStatus, queryFeedHealth, reviewIntelligence, replayLabels, replayCompare, replaySplits, autonomyStatus, autonomyPromotion, paperPositions, positionSizing, learningStatus, learningLatest, learningComparison, learningPromotion, feedHealth, feedDiagnostics, publicContext, regime, observer, observerDiagnostics, killSwitches, exitPolicy, manualCloseWorkflow, venueStatus, venueReliability, reconciliation, tcaSummary, lifecycleSummary, metrics, replayRun, memoryStatus, memoryRetrieval, memoryCoverage, handoffSummary, thinkingSummary, analysisStatus };
  state.selectedCandidateIndex = Math.min(state.selectedCandidateIndex, Math.max(0, candidates.candidates.length - 1));
  state.selectedPersistedIndex = Math.min(state.selectedPersistedIndex, Math.max(0, queryProposals.proposals.proposals.length - 1));
  applyQueueFilters();
  renderAll();
}

function renderAll() {
  renderTopbar();
  renderEntrance();
  renderMetrics();
  renderStateBrief();
  renderDashboardSections();
  renderCandidates();
  renderCandidateAbstentions();
  renderPersistedProposals();
  renderSelectedProposalSurfaces();
  renderEvidence();
  renderReplayMetrics();
  renderReplayRun();
  renderReviewTrends();
  renderHistoricalIntelligence();
  renderReplayComparison();
  renderReplayDiagnostics();
  renderReplayWorkbench();
  renderAutonomy();
  renderLearning();
  renderFeedSnapshots();
  renderFeedTrend();
  renderFeedDegradation();
  renderPublicContext();
  renderObserver();
  renderObserverDiagnostics();
  renderControls();
  renderAnalysisStatus();
  renderModelBoundary();
  renderBoundaryAudit();
  renderMemoryContext();
  renderMemoryRetrieval();
  renderMemoryCoverage();
  renderHandoffSummary();
  renderThinkingSummary();
  renderAnalysisDrilldown();
}

function bindEvents() {
  byId("refresh-button").addEventListener("click", () => {
    loadDashboard().catch((error) => showToast(error.message));
  });
  byId("candidate-priority-filter").addEventListener("change", (event) => {
    state.queue.candidatePriority = event.target.value;
    applyQueueFilters();
    renderCandidates();
    renderSelectedProposalSurfaces();
  });
  byId("candidate-sort").addEventListener("change", (event) => {
    state.queue.candidateSort = event.target.value;
    applyQueueFilters();
    renderCandidates();
    renderSelectedProposalSurfaces();
  });
  byId("persisted-status-filter").addEventListener("change", (event) => {
    state.queue.persistedStatus = event.target.value;
    applyQueueFilters();
    renderPersistedProposals();
    renderSelectedProposalSurfaces();
  });
  byId("persisted-sort").addEventListener("change", (event) => {
    state.queue.persistedSort = event.target.value;
    applyQueueFilters();
    renderPersistedProposals();
    renderSelectedProposalSurfaces();
  });
  byId("abstention-filter").addEventListener("change", (event) => {
    state.queue.abstentionFilter = event.target.value;
    renderCandidateAbstentions();
  });
  byId("historical-kind-filter").addEventListener("change", (event) => {
    state.reviewHistory.kind = event.target.value;
    renderHistoricalIntelligence();
  });
  byId("historical-signal-tier-filter").addEventListener("change", (event) => {
    state.reviewHistory.signalTier = event.target.value;
    renderHistoricalIntelligence();
  });
  byId("historical-review-priority-filter").addEventListener("change", (event) => {
    state.reviewHistory.reviewPriority = event.target.value;
    renderHistoricalIntelligence();
  });
  byId("historical-abstention-filter").addEventListener("change", (event) => {
    state.reviewHistory.abstentionReason = event.target.value;
    renderHistoricalIntelligence();
  });
  byId("historical-direction-filter").addEventListener("change", (event) => {
    state.reviewHistory.direction = event.target.value;
    renderHistoricalIntelligence();
  });
  byId("historical-confidence-filter").addEventListener("change", (event) => {
    state.reviewHistory.confidenceBucket = event.target.value;
    renderHistoricalIntelligence();
  });
  byId("historical-source-filter").addEventListener("change", (event) => {
    state.reviewHistory.source = event.target.value;
    renderHistoricalIntelligence();
  });
  byId("historical-anomaly-filter").addEventListener("change", (event) => {
    state.reviewHistory.anomalySeverity = event.target.value;
    renderHistoricalIntelligence();
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      byId(`view-${tab.dataset.view}`).classList.add("active");
    });
  });
}

// ============================================================
//  CINEMATIC HUD BOOTSTRAP
//  Appended overlay: live ms-tick clock, sparkline + algorithm
//  visualisation helpers, and a demo-mode fallback so the page
//  renders the full Review Control Room look without the live
//  Node server (file:// or unreachable /api/*).
// ============================================================

const HUD_DEMO_DATA = (() => {
  const controls = Array.from({ length: 12 }, (_, index) => ({
    name: `control-${index + 1}`,
    status: "implemented"
  }));
  return {
    health: { ok: true },
    readiness: {
      liveReadiness: {
        liveExecutionAllowed: false,
        blockingReasons: ["live_execution_disabled_by_policy"],
        controls
      }
    },
    feedHealth: {
      feedHealth: {
        overallStatus: "degraded",
        snapshots: []
      }
    },
    analysisStatus: {
      ok: true,
      summary: { analysisControlPlanePassed: true }
    },
    candidates: {
      candidates: [],
      totals: { candidates: 0, abstentions: 174 },
      intelligence: { anomalySummary: { highestSeverity: "none" } }
    },
    metrics: {
      metrics: {
        tcaMetrics: { rejectLikeRate: 0, averageSlippageBps: 1.09 },
        proposalMetrics: { abstentionRate: 0, precision: 0.5 }
      }
    },
    regime: {
      regime: {
        state: "RANGE",
        trend: "neutral",
        volatility: { bucket: "LOW" },
        funding: { bucket: "LOW" },
        calibration: { status: "uncalibrated" }
      }
    },
    evidence: { events: [] },
    queryProposals: { proposals: { proposals: [] } },
    queryStatus: {},
    queryFeedHealth: {},
    reviewIntelligence: {},
    replayLabels: {},
    replayCompare: {},
    replaySplits: {},
    autonomyStatus: {},
    autonomyPromotion: {},
    paperPositions: {},
    positionSizing: {},
    learningStatus: {},
    learningLatest: {},
    learningComparison: {},
    learningPromotion: {},
    feedDiagnostics: { ok: false, error: "demo_mode" },
    publicContext: {},
    observer: {},
    observerDiagnostics: { ok: false, error: "demo_mode" },
    killSwitches: {},
    exitPolicy: { ok: false },
    manualCloseWorkflow: {},
    venueStatus: {},
    venueReliability: {},
    reconciliation: {},
    tcaSummary: { ok: false },
    lifecycleSummary: { ok: false },
    replayRun: {},
    memoryStatus: { ok: false },
    memoryRetrieval: { ok: false },
    memoryCoverage: { ok: false },
    handoffSummary: { ok: false },
    thinkingSummary: { ok: false }
  };
})();

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function tickHudClock() {
  const now = new Date();
  const segments = {
    hrs: pad2(now.getHours()),
    min: pad2(now.getMinutes()),
    sec: pad2(now.getSeconds()),
    ms: pad3(now.getMilliseconds())
  };
  for (const [key, value] of Object.entries(segments)) {
    const node = document.querySelector(`[data-clock="${key}"]`);
    if (node && node.textContent !== value) {
      node.textContent = value;
    }
  }
  const refresh = byId("last-refresh-display");
  if (refresh) {
    refresh.textContent = `${segments.hrs}:${segments.min}:${segments.sec}`;
  }
}

function startHudClock() {
  tickHudClock();
  setInterval(tickHudClock, 50);
}

function renderHudSparkline(svgId, samples) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const width = 120;
  const height = 22;
  const points = samples && samples.length
    ? samples
    : Array.from({ length: 32 }, (_, i) =>
        11 + Math.sin(i * 0.55) * 6 + Math.sin(i * 0.31) * 3
      );
  const stepX = width / (points.length - 1);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points
    .map((value, i) => {
      const x = (i * stepX).toFixed(2);
      const y = (height - ((value - min) / range) * (height - 4) - 2).toFixed(2);
      return `${x},${y}`;
    })
    .join(" ");
  svg.innerHTML = `<polyline points="${coords}"/>`;
}

function renderAlgoParticleWave() {
  const group = document.getElementById("algo-wave-particles");
  if (!group) return;
  const lines = [];
  const count = 56;
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * 240;
    const baseY = 50 + Math.sin(i * 0.32) * 16 + Math.sin(i * 0.11) * 6;
    const len = 4 + Math.abs(Math.sin(i * 0.51)) * 22 + (i / count) * 8;
    const y1 = baseY - len / 2;
    const y2 = baseY + len / 2;
    const opacity = (0.18 + (i / count) * 0.78).toFixed(2);
    lines.push(
      `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y1.toFixed(1)}" y2="${y2.toFixed(1)}" opacity="${opacity}"/>`
    );
  }
  group.innerHTML = lines.join("");
}

function renderHudExtras() {
  try {
    const livePill = byId("live-pill");
    if (livePill) {
      livePill.textContent = livePill.textContent.replace(/^Live\s+/i, "").toUpperCase();
    }
  } catch (_) { /* tolerant */ }
  try {
    const feedPill = byId("feed-pill");
    if (feedPill) {
      feedPill.textContent = feedPill.textContent.replace(/^Indexed feed\s+/i, "").toUpperCase();
    }
  } catch (_) { /* tolerant */ }
  try {
    const feedSub = byId("feed-sub");
    const feedStatus = String(state.data?.feedHealth?.feedHealth?.overallStatus || "").toLowerCase();
    if (feedSub) {
      feedSub.textContent = feedStatus === "degraded"
        ? "evidence quality drift"
        : feedStatus
          ? `evidence ${feedStatus}`
          : "awaiting probe";
    }
  } catch (_) { /* tolerant */ }
  try {
    const sysVal = byId("system-status-value");
    if (sysVal) sysVal.textContent = "OPERATIONAL";
  } catch (_) { /* tolerant */ }
  try {
    const liveState = byId("entrance-live-state");
    if (liveState && liveState.textContent.trim().toUpperCase() === "BLOCKED") {
      liveState.textContent = "LIVE BLOCKED";
    }
  } catch (_) { /* tolerant */ }
  try {
    const readinessState = byId("entrance-readiness-state");
    if (readinessState && /^\d+\/\d+$/.test(readinessState.textContent.trim())) {
      readinessState.textContent = `${readinessState.textContent.trim()} CONTROLS`;
    }
  } catch (_) { /* tolerant */ }
  try {
    const analysisState = byId("entrance-analysis-state");
    if (analysisState && analysisState.textContent.trim().toUpperCase() === "PASSED") {
      analysisState.textContent = "ANALYSIS PASSED";
    }
  } catch (_) { /* tolerant */ }
}

function renderAllSafely() {
  const renderers = [
    renderTopbar, renderEntrance, renderMetrics, renderStateBrief,
    renderDashboardSections, renderCandidates, renderCandidateAbstentions,
    renderPersistedProposals, renderSelectedProposalSurfaces, renderEvidence,
    renderReplayMetrics, renderReplayRun, renderReviewTrends,
    renderHistoricalIntelligence, renderReplayComparison, renderReplayDiagnostics,
    renderReplayWorkbench, renderAutonomy, renderLearning, renderFeedSnapshots,
    renderFeedTrend, renderFeedDegradation, renderPublicContext, renderObserver,
    renderObserverDiagnostics, renderControls, renderAnalysisStatus,
    renderModelBoundary, renderBoundaryAudit, renderMemoryContext,
    renderMemoryRetrieval, renderMemoryCoverage, renderHandoffSummary,
    renderThinkingSummary, renderAnalysisDrilldown
  ];
  for (const fn of renderers) {
    try { fn(); } catch (_) { /* tolerant: skip renderers without demo data */ }
  }
  renderHudExtras();
}

async function bootstrapHud() {
  startHudClock();
  renderHudSparkline("system-sparkline");
  renderAlgoParticleWave();
  bindEvents();

  const isFile = typeof location !== "undefined" && location.protocol === "file:";
  if (isFile) {
    state.data = HUD_DEMO_DATA;
    renderAllSafely();
    return;
  }

  try {
    await loadDashboard();
    renderHudExtras();
  } catch (error) {
    console.warn(
      "[kandor-hud] live API unreachable, rendering demo payload:",
      error && error.message ? error.message : error
    );
    state.data = HUD_DEMO_DATA;
    renderAllSafely();
    showToast("Demo mode — live API unavailable");
  }
}

bootstrapHud();
