import { getAuthUser } from "@/lib/supabase/server";
import ConsultationFloatingCTAClient from "./ConsultationFloatingCTAClient";

export default async function ConsultationFloatingCTA() {
  const user = await getAuthUser();

  if (user) {
    return null;
  }

  return <ConsultationFloatingCTAClient />;
}
