"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
import { submitContact } from "@/lib/api";
import { getDisplayNameForUser } from "@/lib/display-name";
import { SectionAnchorLink } from "@/components/SectionAnchorLink";

/** Standard email syntax: local@domain.tld (one or more non-whitespace/non-@, then @, then domain with at least one dot). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function ContactForm() {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const appkitWalletEmail = useAppSelector((s) => s.auth.appkitWalletEmail);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Prefill name and email from current user. Use @appkit-wallet/EMAIL when wallet/social so form shows real email.
  useEffect(() => {
    if (!user) return;
    const nameToSet = getDisplayNameForUser(user, appkitWalletEmail);
    if (!name.trim() && nameToSet) setName(nameToSet);
    const emailToSet = (appkitWalletEmail && appkitWalletEmail.trim()) || (user.email ?? "").trim();
    if (!email.trim() && emailToSet && isValidEmail(emailToSet)) setEmail(emailToSet);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only prefill when user/appkit email is set and fields are empty
  }, [user, appkitWalletEmail]);

  const showNameError = (touched.name || submitAttempted) && !name.trim();
  const showEmailError =
    (touched.email || submitAttempted) && (!email.trim() || !isValidEmail(email));
  const canSubmit = name.trim() !== "" && email.trim() !== "" && isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await submitContact({
        name: name.trim() || undefined,
        email: email.trim(),
        message: message.trim() || undefined,
        newsletter,
      });
      if (result.ok) {
        toast(t("contact.success"), "success");
        setName("");
        setEmail("");
        setMessage("");
        setNewsletter(false);
        setSubmitAttempted(false);
        setTouched({ name: false, email: false });
      } else {
        toast(result.error ?? t("contact.error"), "error");
      }
    } catch {
      toast(t("contact.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      className="border-t border-border bg-background px-4 py-12 md:px-6 md:py-16"
      aria-labelledby="contact-title"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="contact-title"
          className="font-serif text-2xl font-bold text-foreground md:text-3xl flex items-center gap-2 flex-wrap"
        >
          {t("contact.heading")}
          <SectionAnchorLink sectionId="contact" />
        </h2>
        <p className="mt-2 text-foreground opacity-80">{t("contact.subtitle")}</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-4"
          noValidate
        >
          <div className="block">
            <label htmlFor="contact-name">
              <span className="sr-only">{t("contact.name_placeholder")}</span>
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              placeholder={t("contact.name_placeholder")}
              aria-invalid={showNameError}
              aria-describedby={showNameError ? "contact-name-error" : undefined}
              className={`w-full rounded-lg border bg-input-bg px-4 py-3 text-foreground placeholder:opacity-50 ${
                showNameError ? "border-red-500" : "border-border"
              }`}
            />
            {showNameError && (
              <p id="contact-name-error" className="mt-1 text-sm text-red-500" role="alert">
                {t("contact.validation_name_required")}
              </p>
            )}
          </div>
          <div className="block">
            <label htmlFor="contact-email">
              <span className="sr-only">{t("contact.email_placeholder")}</span>
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              placeholder={t("contact.email_placeholder")}
              required
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? "contact-email-error" : undefined}
              className={`w-full rounded-lg border bg-input-bg px-4 py-3 text-foreground placeholder:opacity-50 ${
                showEmailError ? "border-red-500" : "border-border"
              }`}
            />
            {showEmailError && (
              <p id="contact-email-error" className="mt-1 text-sm text-red-500" role="alert">
                {t("contact.validation_email")}
              </p>
            )}
          </div>
          <label className="block">
            <span className="sr-only">{t("contact.message_placeholder")}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("contact.message_placeholder")}
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-input-bg px-4 py-3 text-foreground placeholder:opacity-50"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="rounded border-border bg-input-bg text-foreground"
            />
            <span className="text-sm text-foreground opacity-80">Newsletter signup</span>
          </label>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="rounded-lg bg-foreground px-6 py-3 font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Sending…" : t("contact.submit")}
          </button>
        </form>
      </div>
    </section>
  );
}
