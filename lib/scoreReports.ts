import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ScoreReportCategory {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
  extra_field_labels: string[];
}

export async function getScoreReportCategories(): Promise<
  ScoreReportCategory[]
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("score_report_categories")
    .select("id, slug, label, description, sort_order, extra_field_labels")
    .order("sort_order", { ascending: true })
    .returns<ScoreReportCategory[]>();

  return data ?? [];
}
