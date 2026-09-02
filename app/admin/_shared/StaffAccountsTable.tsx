import Link from "next/link";
import { formatDateTime } from "@/lib/formatDateTime";
import type { StaffAccountRow } from "@/lib/staffAccounts";

export default function StaffAccountsTable({
  accounts,
  basePath,
}: {
  accounts: StaffAccountRow[];
  basePath: string;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
          <tr>
            <th className="px-4 py-3">이름</th>
            <th className="px-4 py-3">아이디</th>
            <th className="px-4 py-3">전화번호</th>
            <th className="px-4 py-3">가입일</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {accounts.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-zinc-900">
                {row.name}
              </td>
              <td className="px-4 py-3 text-zinc-500">{row.username}</td>
              <td className="px-4 py-3 text-zinc-500">{row.phone}</td>
              <td className="px-4 py-3 text-zinc-500">
                {formatDateTime(row.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`${basePath}/${row.id}`}
                  className="text-xs font-semibold text-brand-dark hover:underline"
                >
                  자세히 보기
                </Link>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                가입한 계정이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
