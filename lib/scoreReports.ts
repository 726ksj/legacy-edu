import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ScoreReportCategory {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export async function getScoreReportCategories(): Promise<
  ScoreReportCategory[]
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("score_report_categories")
    .select("id, slug, label, description, sort_order")
    .order("sort_order", { ascending: true })
    .returns<ScoreReportCategory[]>();

  return data ?? [];
}
