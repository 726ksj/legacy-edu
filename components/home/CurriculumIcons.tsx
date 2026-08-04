const stroke = "#4fb28b";
const strokeDark = "#3d9873";
const soft = "#e8f6f0";

export function DiagnoseIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <rect x="14" y="20" width="56" height="42" rx="6" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <rect x="14" y="20" width="56" height="12" rx="6" fill={stroke} />
      <circle cx="21" cy="26" r="1.6" fill="#fff" />
      <circle cx="26" cy="26" r="1.6" fill="#fff" />
      <circle cx="31" cy="26" r="1.6" fill="#fff" />
      <polyline
        points="22,52 30,44 38,49 50,36"
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="52" r="2" fill={stroke} />
      <circle cx="30" cy="44" r="2" fill={stroke} />
      <circle cx="38" cy="49" r="2" fill={stroke} />
      <circle cx="50" cy="36" r="2" fill={stroke} />
      <circle cx="60" cy="58" r="14" fill={soft} stroke={stroke} strokeWidth="2.5" />
      <line x1="70" y1="68" x2="78" y2="76" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function VocabularyIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <rect x="26" y="16" width="44" height="30" rx="6" fill={soft} stroke={stroke} strokeWidth="2" />
      <rect x="20" y="22" width="44" height="30" rx="6" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <line x1="29" y1="32" x2="55" y2="32" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="29" y1="40" x2="45" y2="40" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M22 62 Q 30 74 44 68"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <polygon points="46,64 44,71 38,67" fill={stroke} />
      <text x="52" y="70" fontSize="13" fontWeight="700" fill={strokeDark}>
        A
      </text>
      <text x="63" y="70" fontSize="13" fontWeight="700" fill={strokeDark}>
        →
      </text>
      <text x="74" y="70" fontSize="13" fontWeight="700" fill={stroke}>
        A+
      </text>
    </svg>
  );
}

export function ChoiceAnalysisIcon() {
  const rows = [22, 34, 46, 58, 70];
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <rect x="18" y="12" width="46" height="64" rx="6" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      {rows.map((y, i) => (
        <g key={y}>
          <circle cx="27" cy={y} r="2.4" fill={i === 2 ? stroke : "#c7cdd4"} />
          <line
            x1="34"
            y1={y}
            x2={i === 2 ? 56 : 50}
            y2={y}
            stroke={i === 2 ? stroke : "#d7dce1"}
            strokeWidth={i === 2 ? 3 : 2}
            strokeLinecap="round"
          />
        </g>
      ))}
      <circle cx="62" cy="62" r="15" fill={soft} stroke={stroke} strokeWidth="2.5" />
      <line x1="72.5" y1="72.5" x2="81" y2="81" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SchoolFitIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <polyline
        points="16,44 48,18 80,44"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="24" y="44" width="48" height="30" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <rect x="30" y="50" width="8" height="8" fill={soft} stroke={stroke} strokeWidth="1.5" />
      <rect x="44" y="50" width="8" height="8" fill={soft} stroke={stroke} strokeWidth="1.5" />
      <rect x="58" y="50" width="8" height="8" fill={soft} stroke={stroke} strokeWidth="1.5" />
      <rect x="42" y="62" width="12" height="12" fill={stroke} />
      <circle cx="68" cy="34" r="13" fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <line x1="68" y1="34" x2="68" y2="27" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="68" y1="34" x2="73" y2="36" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorCorrectionIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <circle cx="22" cy="30" r="13" fill="#fff" stroke="#e0685c" strokeWidth="2.5" />
      <line x1="17" y1="25" x2="27" y2="35" stroke="#e0685c" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="27" y1="25" x2="17" y2="35" stroke="#e0685c" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="37" y1="30" x2="55" y2="30" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="55,25 63,30 55,35" fill={stroke} />
      <circle cx="76" cy="30" r="13" fill={soft} stroke={stroke} strokeWidth="2.5" />
      <polyline
        points="70,30 74,35 82,24"
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="30" y="54" width="36" height="16" rx="8" fill={stroke} />
      <text x="48" y="65" fontSize="9" fontWeight="700" fill="#fff" textAnchor="middle">
        RETEST
      </text>
    </svg>
  );
}

export function FeedbackReportIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" className="h-20 w-20">
      <rect x="16" y="16" width="64" height="64" rx="14" fill="#fff" stroke={stroke} strokeWidth="2" />
      <rect x="28" y="48" width="8" height="20" rx="2" fill={soft} />
      <rect x="42" y="38" width="8" height="30" rx="2" fill={stroke} />
      <rect x="56" y="30" width="8" height="38" rx="2" fill={strokeDark} />
      <line x1="66" y1="60" x2="72" y2="60" stroke="#c7cdd4" strokeWidth="2" strokeLinecap="round" />
      <line x1="66" y1="66" x2="72" y2="66" stroke="#c7cdd4" strokeWidth="2" strokeLinecap="round" />
      <polyline
        points="56,30 64,24 70,28"
        fill="none"
        stroke={strokeDark}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="70" cy="28" r="2" fill={strokeDark} />
    </svg>
  );
}

export const STEP_ICONS = [
  DiagnoseIcon,
  VocabularyIcon,
  ChoiceAnalysisIcon,
  SchoolFitIcon,
  ErrorCorrectionIcon,
  FeedbackReportIcon,
];
