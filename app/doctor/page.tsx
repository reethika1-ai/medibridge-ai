import { redirect } from "next/navigation";

export default function DoctorPage() {
  redirect("/hospital?tab=doctor");
}
