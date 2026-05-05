/**
 * Display name for the current user, used consistently in:
 * - Contact Us form (name field)
 * - Agreement pages (signature / contact name)
 *
 * For wallet users we prefer the email local part (e.g. "Reward2learn" from
 * reward2learn@gmail.com) when available, instead of "Wallet User 0xAEd5...0070".
 */

export interface UserLike {
  name?: string | null;
}

const WALLET_USER_PREFIX = "Wallet User ";

export function getDisplayNameForUser(
  user: UserLike | null | undefined,
  appkitWalletEmail?: string | null
): string {
  if (!user) return "";
  const name = (user.name ?? "").trim();
  const isWalletPlaceholder = name.startsWith(WALLET_USER_PREFIX);
  if (isWalletPlaceholder && appkitWalletEmail?.trim()) {
    const local = appkitWalletEmail.trim().replace(/@.*$/, "").trim();
    if (local) {
      const capitalized = local.replace(/^([a-z])/, (_, c: string) => c.toUpperCase());
      return capitalized || name;
    }
  }
  return name;
}
