"use client";

import { useState } from "react";

function formatWithCommas(digits: string) {
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export default function PriceInput({
  name,
  defaultValue,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: number | string | null;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(() =>
    defaultValue != null && defaultValue !== ""
      ? formatWithCommas(String(defaultValue))
      : "",
  );

  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, "");
        setValue(formatWithCommas(digits));
      }}
      placeholder={placeholder}
      autoComplete="off"
      className={className}
    />
  );
}
