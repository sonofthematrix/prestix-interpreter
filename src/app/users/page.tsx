"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { patchAdminUser, setUserPassword, patchSiteSettings, patchAdminPartnershipAgreement, deleteAdminPartnershipAgreement } from "@/lib/api";
import type { AdminUser, AdminUserMembership, PartnershipAgreement } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { ExportIcon } from "@/components/ExportIcon";
import { AdminPageGate } from "@/components/AdminPageGate";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminUsers } from "@/store/slices/dataSlice";
import { setSiteSettingsMarketplaceUrl, patchAdminUserInList, patchAdminUserAgreementInList, removeAdminUserAgreementInList } from "@/store/slices/dataSlice";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const MEMBERSHIP_TIER_NAMES: Record<string, string> = {
  essential: "Essential",
  pro: "Pro",
  event_organizer: "Event Organizer",
  elite: "Partner",
};
function getMembershipTierName(tier: string): string {
  return MEMBERSHIP_TIER_NAMES[tier] || tier;
}

type RoleFilter = "all" | "partner" | "promoter" | "event_organizer";

function matchesRoleFilter(u: AdminUser, filter: RoleFilter): boolean {
  if (filter === "all") return true;
  if (filter === "partner") return u.isPartner === true || u.role === "partner";
  if (filter === "promoter") return u.role === "promoter";
  if (filter === "event_organizer") return u.role === "event_organizer";
  return true;
}

function AgreementModal({
  user,
  agreement: initialAgreement,
  agreedAt,
  onClose,
  onAgreementUpdated,
}: {
  user: AdminUser;
  agreement: PartnershipAgreement;
  agreedAt?: string;
  onClose: () => void;
  onAgreementUpdated: (agreement: PartnershipAgreement) => void;
}) {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [agreement, setAgreement] = useState<PartnershipAgreement>(initialAgreement);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    venueName: initialAgreement.venueName,
    contactName: initialAgreement.contactName,
    email: initialAgreement.email,
    phone: initialAgreement.phone ?? "",
    address: initialAgreement.address ?? "",
    country: initialAgreement.country ?? "",
    venueGoogleMapsUrl: initialAgreement.venueGoogleMapsUrl ?? "",
    businessTaxNumber: initialAgreement.businessTaxNumber ?? "",
    signatureName: initialAgreement.signatureName ?? "",
    comments: initialAgreement.comments ?? "",
    walletAddress: initialAgreement.walletAddress ?? "",
  });

  useEffect(() => {
    setAgreement(initialAgreement);
    setForm({
      venueName: initialAgreement.venueName,
      contactName: initialAgreement.contactName,
      email: initialAgreement.email,
      phone: initialAgreement.phone ?? "",
      address: initialAgreement.address ?? "",
      country: initialAgreement.country ?? "",
      venueGoogleMapsUrl: initialAgreement.venueGoogleMapsUrl ?? "",
      businessTaxNumber: initialAgreement.businessTaxNumber ?? "",
      signatureName: initialAgreement.signatureName ?? "",
      comments: initialAgreement.comments ?? "",
      walletAddress: initialAgreement.walletAddress ?? "",
    });
  }, [initialAgreement]);

  const isApproved = agreement.approved === true;
  const approvedAt = agreement.approvedAt ? new Date(agreement.approvedAt).toLocaleString() : null;
  const approvedBy = agreement.approvedBy ?? null;

  const handleSave = async () => {
    setSaving(true);
    const result = await patchAdminPartnershipAgreement({
      userId: user.id,
      venueName: form.venueName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      country: form.country.trim() || undefined,
      venueGoogleMapsUrl: form.venueGoogleMapsUrl.trim() || undefined,
      businessTaxNumber: form.businessTaxNumber.trim() || undefined,
      signatureName: form.signatureName.trim() || undefined,
      comments: form.comments.trim() || undefined,
      walletAddress: form.walletAddress.trim() || undefined,
    });
    setSaving(false);
    if (result.ok) {
      const updated: PartnershipAgreement = { ...agreement, ...form };
      setAgreement(updated);
      dispatch(patchAdminUserAgreementInList({ userId: user.id, agreement: updated }));
      onAgreementUpdated(updated);
      setIsEditing(false);
      toast("Agreement updated.", "success");
    } else {
      toast(result.error ?? "Update failed", "error");
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    const result = await patchAdminPartnershipAgreement({ userId: user.id, approved: true });
    setApproving(false);
    if (result.ok) {
      const updated: PartnershipAgreement = {
        ...agreement,
        approved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: undefined, // use Refresh on the page to load approvedBy from server
      };
      setAgreement(updated);
      dispatch(patchAdminUserAgreementInList({ userId: user.id, agreement: updated }));
      onAgreementUpdated(updated);
      toast("Partnership approved.", "success");
      // Do not refetch here: a quick GET can return before the server has persisted the approval,
      // which would overwrite the optimistic update and make the checkbox appear unchecked again.
      // Use the Refresh button to reload and get server state (e.g. approvedBy) when needed.
    } else {
      toast(result.error ?? "Approve failed", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Permanently delete this partnership agreement? The user will need to submit a new one.")) return;
    setDeleting(true);
    const result = await deleteAdminPartnershipAgreement({ userId: user.id });
    setDeleting(false);
    if (result.ok) {
      dispatch(removeAdminUserAgreementInList({ userId: user.id }));
      onClose();
      toast("Agreement deleted.", "success");
    } else {
      toast(result.error ?? "Delete failed", "error");
    }
  };

  const displayRows = [
    { label: "Venue name", value: agreement.venueName, key: "venueName" },
    { label: "Contact name", value: agreement.contactName, key: "contactName" },
    { label: "Email", value: agreement.email, key: "email" },
    { label: "Phone", value: agreement.phone || "—", key: "phone" },
    { label: "Address", value: agreement.address || "—", key: "address" },
    { label: "Country", value: agreement.country || "—", key: "country" },
    { label: "Venue (Google Maps URL)", value: agreement.venueGoogleMapsUrl || "—", key: "venueGoogleMapsUrl" },
    { label: "Business Tax Number", value: agreement.businessTaxNumber || "—", key: "businessTaxNumber" },
    { label: "Agree: Logo on bike", value: agreement.agreeLogoOnBike ? "Yes" : "No" },
    { label: "Agree: VIP experience", value: agreement.agreeVipExperience ? "Yes" : "No" },
    { label: "Agree: Terms", value: agreement.agreeTerms ? "Yes" : "No" },
    { label: "Signature (name)", value: agreement.signatureName || "—", key: "signatureName" },
    { label: "Submitted at", value: agreement.submittedAt ? new Date(agreement.submittedAt).toLocaleString() : agreedAt ? new Date(agreedAt).toLocaleString() : "—" },
    ...(agreement.comments ? [{ label: "Comments", value: agreement.comments, key: "comments" as const }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agreement-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg flex flex-col rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-muted-bg px-4 py-3 shrink-0">
          <h2 id="agreement-modal-title" className="font-semibold text-foreground">
            Partnership agreement — {user.email || user.name || user.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground opacity-70 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-2 text-sm overflow-y-auto flex-1 min-h-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">
              Approval status:{" "}
              {isApproved ? (
                <span className="text-green-600 dark:text-green-400">Approved</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">Pending</span>
              )}
            </span>
            {isApproved && approvedAt && (
              <span className="text-xs text-foreground opacity-70">
                {approvedAt}
                {approvedBy ? ` by ${approvedBy}` : ""}
              </span>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-3">
              {[
                { key: "venueName" as const, label: "Venue name" },
                { key: "contactName" as const, label: "Contact name" },
                { key: "email" as const, label: "Email" },
                { key: "phone" as const, label: "Phone" },
                { key: "address" as const, label: "Address" },
                { key: "country" as const, label: "Country" },
                { key: "venueGoogleMapsUrl" as const, label: "Venue (Google Maps URL)" },
                { key: "businessTaxNumber" as const, label: "Business Tax Number" },
                { key: "signatureName" as const, label: "Signature (name)" },
                { key: "comments" as const, label: "Comments" },
                { key: "walletAddress" as const, label: "Wallet address" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-foreground opacity-80">{label}</label>
                  <input
                    type={key === "email" ? "email" : "text"}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-0.5 w-full rounded border border-border bg-input-bg px-2 py-1.5 text-foreground text-sm"
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {displayRows.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground opacity-80">{label}</span>
                  <span className="text-foreground whitespace-pre-wrap">{value}</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-muted-bg px-4 py-3 shrink-0">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-red-500/50 bg-background px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                >
                  {deleting ? "Deleting…" : "Delete agreement"}
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {!isApproved && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approving ? "Approving…" : "Approve"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MembershipModal({
  user,
  membership,
  onClose,
}: {
  user: AdminUser;
  membership: AdminUserMembership;
  onClose: () => void;
}) {
  const isYearly = membership.billingPeriod === "yearly";
  const expiry = membership.expiryDate ? new Date(membership.expiryDate) : null;
  const status = expiry && expiry > new Date() ? "Active" : "Expired";
  const paymentDate = membership.startDate ? new Date(membership.startDate).toLocaleString() : "—";
  const expiryDate = membership.expiryDate ? new Date(membership.expiryDate).toLocaleString() : "—";
  const tierName = getMembershipTierName(membership.tier);
  const amountByTier: Record<string, { monthly: number; yearly: number }> = {
    essential: { monthly: 25, yearly: 225 },
    pro: { monthly: 69, yearly: 621 },
    event_organizer: { monthly: 199, yearly: 1791 },
    elite: { monthly: 500, yearly: 4500 },
  };
  const amount = amountByTier[membership.tier] ? (isYearly ? amountByTier[membership.tier].yearly : amountByTier[membership.tier].monthly) : null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-md flex flex-col rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-muted-bg px-4 py-3 shrink-0">
          <h2 id="membership-modal-title" className="font-semibold text-foreground">
            Membership — {user.email || user.name || user.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground opacity-70 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground opacity-80">Membership tier</span>
            <span className="text-foreground">{tierName}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground opacity-80">Billing type</span>
            <span className="text-foreground">{isYearly ? "Yearly" : "Monthly"}</span>
          </div>
          {amount != null && (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground opacity-80">Amount (USD)</span>
              <span className="text-foreground">${amount}</span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground opacity-80">Payment date</span>
            <span className="text-foreground">{paymentDate}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground opacity-80">Expiry date</span>
            <span className="text-foreground">{expiryDate}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground opacity-80">Status</span>
            <span className={status === "Active" ? "text-green-600 dark:text-green-400" : "text-foreground opacity-80"}>{status}</span>
          </div>
        </div>
        <div className="border-t border-border bg-muted-bg px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const users = useAppSelector((s) => s.data.adminUsers);
  const loading = useAppSelector((s) => s.data.adminUsersLoading);
  const error = useAppSelector((s) => s.data.adminUsersError);
  const marketplaceUrlFromStore = useAppSelector((s) => s.data.siteSettings.marketplaceUrl);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(100);
  const [page, setPage] = useState(1);
  const [patching, setPatching] = useState<string | null>(null);
  const [approvalPatchingUserId, setApprovalPatchingUserId] = useState<string | null>(null);
  const [settingPassword, setSettingPassword] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [agreementModalUserId, setAgreementModalUserId] = useState<string | null>(null);
  const [membershipModalUserId, setMembershipModalUserId] = useState<string | null>(null);
  const [marketplaceUrl, setMarketplaceUrl] = useState(marketplaceUrlFromStore);
  const [savingMarketplace, setSavingMarketplace] = useState(false);

  const agreementModalUser = agreementModalUserId
    ? users.find((u) => u.id === agreementModalUserId) ?? null
    : null;
  const membershipModalUser = membershipModalUserId
    ? users.find((u) => u.id === membershipModalUserId) ?? null
    : null;

  useEffect(() => {
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  useEffect(() => {
    setMarketplaceUrl(marketplaceUrlFromStore);
  }, [marketplaceUrlFromStore]);

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.email || "").toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q)
      );
    }
    return roleFilter === "all" ? list : list.filter((u) => matchesRoleFilter(u, roleFilter));
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * perPage;
  const pageUsers = filtered.slice(start, start + perPage);

  const handleAdminChange = async (user: AdminUser, isAdmin: boolean) => {
    setPatching(user.id);
    dispatch(patchAdminUserInList({ userId: user.id, patch: { isAdmin } }));
    const result = await patchAdminUser({ userId: user.id, isAdmin });
    setPatching(null);
    if (result.ok) {
      toast("Admin role updated", "success");
    } else {
      dispatch(patchAdminUserInList({ userId: user.id, patch: { isAdmin: user.isAdmin } }));
      toast(result.error ?? "Update failed", "error");
    }
  };

  const handleActiveChange = async (user: AdminUser, active: boolean) => {
    setPatching(user.id);
    dispatch(patchAdminUserInList({ userId: user.id, patch: { active } }));
    const result = await patchAdminUser({ userId: user.id, active });
    setPatching(null);
    if (result.ok) {
      toast("Active status updated", "success");
    } else {
      dispatch(patchAdminUserInList({ userId: user.id, patch: { active: user.active } }));
      toast(result.error ?? "Update failed", "error");
    }
  };

  const handlePartnerChange = async (user: AdminUser, isPartner: boolean) => {
    if (String(user.id).startsWith("profile-")) return;
    setPatching(user.id);
    dispatch(patchAdminUserInList({ userId: user.id, patch: { isPartner } }));
    const result = await patchAdminUser({ userId: user.id, isPartner });
    setPatching(null);
    if (result.ok) {
      toast("Partner status updated", "success");
    } else {
      dispatch(patchAdminUserInList({ userId: user.id, patch: { isPartner: user.isPartner } }));
      toast(result.error ?? "Update failed", "error");
    }
  };

  const handleApprovalChange = async (user: AdminUser, approved: boolean) => {
    if (!user.partnershipAgreement || String(user.id).startsWith("profile-")) return;
    setApprovalPatchingUserId(user.id);
    const result = await patchAdminPartnershipAgreement({ userId: user.id, approved });
    setApprovalPatchingUserId(null);
    if (result.ok) {
      const updatedAgreement: PartnershipAgreement = {
        ...user.partnershipAgreement,
        approved,
        approvedAt: approved ? new Date().toISOString() : undefined,
        approvedBy: approved ? user.partnershipAgreement.approvedBy : undefined,
      };
      dispatch(patchAdminUserAgreementInList({ userId: user.id, agreement: updatedAgreement }));
      if (approved) dispatch(fetchAdminUsers()); // refetch so approvedBy is populated from server
      toast(approved ? "Agreement approved." : "Agreement set to not approved.", "success");
    } else {
      toast(result.error ?? "Update failed", "error");
    }
  };

  const handleSetPassword = async (user: AdminUser) => {
    const email = user.email?.trim();
    if (!email) return;
    const raw = window.prompt(
      "Enter new password (min 8 characters). User will be able to sign in with email + this password."
    );
    if (raw == null) return;
    if (raw.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }
    setSettingPassword(email);
    const result = await setUserPassword(email, raw);
    setSettingPassword(null);
    if (result.ok) {
      toast(result.message ?? "Password set.", "success");
    } else {
      toast(result.error ?? "Failed", "error");
    }
  };

  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 md:px-6 md:py-12">
          <div className="mx-auto">
            <h1 className="font-serif text-5xl font-bold text-foreground">User management</h1>
            <p className="mt-4 text-foreground opacity-80">Loading…</p>
          </div>
        </div>
      }
    >
      <AdminPageGate pageTitle="User management">
      {loading ? (
        <div className="px-4 py-8 md:px-6 md:py-12">
          <div className="mx-auto ">
            <h1 className="font-serif text-5xl font-bold text-foreground">User management</h1>
            <p className="mt-4 text-foreground opacity-80">Loading…</p>
          </div>
        </div>
      ) : error ? (
        <div className="px-4 py-8 md:px-6 md:py-12">
          <div className="mx-auto ">
            <h1 className="font-serif text-5xl font-bold text-foreground">User management</h1>
            <p className="mt-4 text-foreground opacity-80">{error}</p>
          </div>
        </div>
      ) : (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto ">
        <div className="mb-2 flex items-center gap-2 text-sm text-foreground opacity-70">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span>User management</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-5xl font-bold text-foreground">
              User management
            </h1>
            <p className="mt-2 text-foreground opacity-80">
              Manage users who have signed in and assign admin role.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/users/feedback"
              className="shrink-0 rounded-lg border border-border bg-muted-bg px-4 py-2 text-sm font-medium text-foreground hover:bg-input-bg"
            >
              Feedback
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-muted-bg p-4">
          <h3 className="text-sm font-semibold text-foreground">Site settings</h3>
          <p className="mt-1 text-sm text-foreground opacity-80">
            Marketplace URL used by the &quot;Visit Marketplace&quot; button on the landing page. Opens in a new window.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <input
              type="url"
              value={marketplaceUrl}
              onChange={(e) => setMarketplaceUrl(e.target.value)}
              placeholder="https://prestix.vip/marketplace"
              className="min-w-0 flex-1 rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground"
              aria-label="Marketplace URL"
            />
            <button
              type="button"
              disabled={savingMarketplace}
              onClick={async () => {
                setSavingMarketplace(true);
                const result = await patchSiteSettings({ marketplaceUrl: marketplaceUrl.trim() });
                setSavingMarketplace(false);
                if ("error" in result) {
                  toast(result.error, "error");
                } else {
                  dispatch(setSiteSettingsMarketplaceUrl(result.marketplaceUrl));
                  setMarketplaceUrl(result.marketplaceUrl);
                  toast("Marketplace URL saved.", "success");
                }
              }}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {savingMarketplace ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Search email, name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-xs rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:opacity-50"
              aria-label="Search users"
            />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as RoleFilter);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-input-bg px-2 py-1.5 text-sm text-foreground"
              aria-label="Filter by role"
            >
              <option value="all">All users</option>
              <option value="partner">Partners</option>
              <option value="promoter">Promoters</option>
              <option value="event_organizer">Event Organizers</option>
            </select>
            <a
              href="/api/admin/export"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-muted-bg p-2.5 text-foreground hover:bg-input-bg"
              title="Download user data (Excel)"
              aria-label="Download user data"
            >
              <ExportIcon />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground opacity-70">Rows per page</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-border bg-input-bg px-2 py-1.5 text-sm text-foreground"
              aria-label="Rows per page"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-sm text-foreground opacity-70">
              {filtered.length === 0 ? "0" : `${start + 1}–${Math.min(start + perPage, filtered.length)}`} of {filtered.length}
            </span>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
            >
              Next
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => dispatch(fetchAdminUsers())}
              className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground hover:bg-input-bg disabled:opacity-50 inline-flex items-center gap-1.5"
              title="Reload and fetch latest user data"
              aria-label="Refresh user list"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? "animate-spin" : ""}
                aria-hidden
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-left text-sm" role="grid">
            <thead>
              <tr className="border-b border-border bg-muted-bg">
                <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 font-semibold text-foreground">Last seen</th>
                <th className="px-4 py-3 font-semibold text-foreground">Admin</th>
                <th className="px-4 py-3 font-semibold text-foreground">Partner</th>
                <th className="px-4 py-3 font-semibold text-foreground">Active</th>
                <th className="px-4 py-3 font-semibold text-foreground">Set password</th>
                <th className="px-4 py-3 font-semibold text-foreground">Membership</th>
                <th className="px-4 py-3 font-semibold text-foreground">Agreement</th>
                <th className="px-4 py-3 font-semibold text-foreground">Approved</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((u) => {
                const isProfileOnly = String(u.id).startsWith("profile-");
                return (
                  <tr
                    key={u.id}
                    className="border-b border-border text-foreground last:border-0"
                  >
                    <td className="px-4 py-3">{u.email || "—"}</td>
                    <td className="px-4 py-3">{u.name || "—"}</td>
                    <td className="px-4 py-3">
                      {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!u.isAdmin}
                          disabled={!!patching}
                          onChange={(e) => handleAdminChange(u, e.target.checked)}
                          className="rounded border-border bg-input-bg text-foreground"
                          aria-label={`Admin for ${u.email || u.id}`}
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!u.isPartner}
                          disabled={isProfileOnly || !!patching}
                          onChange={(e) => handlePartnerChange(u, e.target.checked)}
                          className="rounded border-border bg-input-bg text-foreground"
                          aria-label={`Partner for ${u.email || u.id}`}
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={u.active !== false}
                          disabled={!!patching}
                          onChange={(e) => handleActiveChange(u, e.target.checked)}
                          className="rounded border-border bg-input-bg text-foreground"
                          aria-label={`Active for ${u.email || u.id}`}
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!u.email || settingPassword === (u.email || "").trim()}
                        onClick={() => handleSetPassword(u)}
                        className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground hover:bg-input-bg disabled:opacity-50"
                      >
                        Set password
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {u.membership ? (
                        <button
                          type="button"
                          onClick={() => setMembershipModalUserId(u.id)}
                          className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground hover:bg-input-bg"
                        >
                          {getMembershipTierName(u.membership.tier)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.partnershipAgreement ? (
                        <button
                          type="button"
                          onClick={() => setAgreementModalUserId(u.id)}
                          className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground hover:bg-input-bg"
                        >
                          View agreement
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.partnershipAgreement ? (
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={u.partnershipAgreement.approved === true}
                            disabled={!!approvalPatchingUserId}
                            onChange={(e) => handleApprovalChange(u, e.target.checked)}
                            className="rounded border-border bg-input-bg text-foreground"
                            aria-label={`Agreement approved for ${u.email || u.id}`}
                          />
                          <span className="sr-only">
                            {u.partnershipAgreement.approved === true ? "Approved" : "Not approved"}
                          </span>
                        </label>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageUsers.length === 0 && (
          <p className="mt-4 text-center text-sm text-foreground opacity-70">
            No users to show.
          </p>
        )}

        {agreementModalUser?.partnershipAgreement && (
          <AgreementModal
            user={agreementModalUser}
            agreement={agreementModalUser.partnershipAgreement}
            agreedAt={agreementModalUser.partnershipAgreedAt ?? undefined}
            onClose={() => setAgreementModalUserId(null)}
            onAgreementUpdated={(agreement) => {
              dispatch(patchAdminUserAgreementInList({ userId: agreementModalUser.id, agreement }));
            }}
          />
        )}
        {membershipModalUser?.membership && (
          <MembershipModal
            user={membershipModalUser}
            membership={membershipModalUser.membership}
            onClose={() => setMembershipModalUserId(null)}
          />
        )}
      </div>
    </div>
      )}
    </AdminPageGate>
    </Suspense>
  );
}
