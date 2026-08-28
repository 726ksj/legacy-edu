"use client";

export default function PrintButton({ fileName }: { fileName: string }) {
  function handlePrint() {
    const previousTitle = document.title;
    document.title = fileName;

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);

    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="print:hidden shrink-0 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
    >
      PDF로 저장
    </button>
  );
}
