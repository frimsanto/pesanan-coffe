import { redirect } from "next/navigation";

export default function Home() {
  // Entry point aplikasi -> arahkan ke login staf.
  redirect("/login");
}
