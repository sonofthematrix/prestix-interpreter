import { redirect } from "next/navigation";
import { PRIMARY_INTERPRETER_ROUTE } from "../lib/interpreter/uiEntry";

export default function HomePage() {
  redirect(PRIMARY_INTERPRETER_ROUTE);
}
