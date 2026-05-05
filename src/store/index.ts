import { configureStore, type Middleware } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import dataReducer from "./slices/dataSlice";
import { setSignInOpen } from "./slices/uiSlice";

/** When auth has no user and is not loading, ensure sign-in modal is open (single place, no useEffect). Skip when user clicked Connect Wallet (openingAppKit) so AppKit modal can open. */
const signInOpenSafeguard: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();
  if (state.ui.openingAppKit) return result;
  if (
    state.auth.user === null &&
    state.auth.loading === false &&
    !state.ui.signInOpen
  ) {
    store.dispatch(setSignInOpen(true));
  }
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    data: dataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(signInOpenSafeguard),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
