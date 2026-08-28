import "server-only";

const PAGE_SIZE = 1000;

// PostgREST(Supabase)는 명시적 range 없이 조회하면 기본 최대 반환 행
// 수(보통 1000건)에서 결과가 조용히 잘린다. 집계용 대시보드처럼 "전부"
// 필요한 조회는 range를 옮겨가며 끝까지 모아야 한다.
export async function fetchAllRows<T>(
  buildQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
