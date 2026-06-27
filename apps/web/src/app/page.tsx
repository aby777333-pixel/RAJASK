import { redirect } from "next/navigation";

export default function Home() {
  // Phase 0: the THRONE shell is the entry point. COURT (Phase 1) adds the
  // sign-in gate and realm selection in front of this.
  redirect("/throne");
}
