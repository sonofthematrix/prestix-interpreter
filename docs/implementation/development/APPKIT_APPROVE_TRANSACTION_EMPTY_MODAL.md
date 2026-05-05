# AppKit: Empty "Approve Transaction" Modal and EIP-1271 Verification

## Symptoms

- **Empty modal**: The "Approve Transaction" modal appears when signing in (e.g. Google + wallet SIWE) but the modal body is empty—no message preview, no Approve/Reject buttons.
- **Console events**: You see `@w3m-app/SYNC_THEME`, `@w3m-app/GET_CHAIN_ID`, and `@w3m-app/RPC_REQUEST` with `method: "personal_sign"` and valid `params` (message + address).
- **Server log**: `TypeError: invalid raw signature length` in `src/lib/siwe.ts` at `siweMessage.verify()`, followed by `✅ SIWE verification successful (smart account / EIP-1271)` and a 200 response.

## Root causes

### 1. Empty modal (frontend)

The modal that opens is the **generic RPC view** (`ApproveTransaction`). For Reown SIWX/social login, the sign request is sent via `personal_sign` and the SDK shows this generic view. In some flows (especially embedded/social wallet), the view can open **before** the UI state that holds the current request payload is set, or the view component that renders the message/buttons is not wired for this path, so the modal appears with no content.

- **Events**: `RPC_REQUEST` with `personal_sign` is emitted correctly, so the request is initiated.
- **Content**: The view that renders "Approve Transaction" may not receive or display that request for the SIWX/auth path. The SIWE-specific view is `SIWXSignMessage`, which does show message and actions; the generic `ApproveTransaction` view can be empty when used for auth.

**Mitigation (optional):**

- Ensure **no fetch/error-suppression** mocks block or alter `api.web3modal.org` (see project `.cursorrules` and any layout interceptors). Blocking config or request APIs can lead to missing UI data.
- If you control the auth flow, prefer opening the **SIWXSignMessage** view for SIWE instead of the generic ApproveTransaction view (SDK-dependent).
- Signing still completes: the wallet/social provider signs and sends the signature; the backend verifies it. The empty modal is a **display** issue, not an auth failure.

### 2. Server "invalid raw signature length" (backend) — fixed

**Cause:** Social/embedded wallets (e.g. Google login) use **smart accounts** and produce **EIP-1271**-style signatures. These are long, contract-call-style payloads (e.g. starting with `0x0000...`), not 65-byte EOA signatures. The `siwe` package's `verify()` expects EOA format and throws `TypeError: invalid raw signature length` when given this format.

**Fix (implemented in `src/lib/siwe.ts`):**

- **Detect smart-account signatures**: `isSmartAccountSignature(signature)` returns true when the hex length is > 132 or the signature looks like contract data (e.g. 0-padded).
- **Skip `siweMessage.verify()` for those**: For such signatures we do **not** call `siwe.verify()`; we go straight to **viem** `verifyMessage` (EIP-1271 path).
- **Result**: No more `invalid raw signature length` error; verification succeeds via viem with a single code path and less log noise.

## Summary

| Issue | Cause | Status |
|-------|--------|--------|
| Empty "Approve Transaction" modal | Generic RPC view used for SIWE; view may not show request content in social/embedded flow | Display-only; auth works. Avoid mocking api.web3modal.org. |
| `TypeError: invalid raw signature length` | EIP-1271 signature passed to `siwe.verify()` which expects EOA | Fixed: smart-account detection + viem-only path in `siwe.ts`. |
