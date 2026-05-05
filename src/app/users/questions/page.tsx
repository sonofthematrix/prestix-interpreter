import { redirect } from "next/navigation";

/**
 * Legacy route: redirect /users/questions to /users/feedback.
 * Preserves query string (e.g. ?verify-code=948230).
 */
export default function UsersQuestionsRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((vv) => qs.append(k, vv));
    else if (v != null) qs.set(k, v);
  });
  const query = qs.toString();
  redirect(query ? `/users/feedback?${query}` : "/users/feedback");
}
