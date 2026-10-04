"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FontSize } from "@/lib/tiptapFontSize";

const FONT_FAMILIES = [
  { label: "기본체", value: "" },
  { label: "고딕체", value: "sans-serif" },
  { label: "명조체", value: "'Nanum Myeongjo', serif" },
  { label: "손글씨체", value: "cursive" },
];

const FONT_SIZES = [
  { label: "기본", value: "" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // 버튼을 클릭하면 브라우저가 기본 동작으로 그 버튼에 포커스를 주는데,
      // 이 포커스 이동이 바로 아래 onClick에서 에디터로 포커스를 되돌리는
      // 것과 경쟁하면서 타이밍에 따라 포커스가 엉뚱한 곳(버튼 쪽)에 남는
      // 문제가 있었다. mousedown 시점에 기본 동작을 막아 애초에 에디터가
      // 포커스를 잃지 않게 한다 - 이러면 onClick의 명령은 그대로 현재
      // 선택 영역에 적용된다.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      tabIndex={-1}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 ${
        active ? "bg-zinc-200 text-zinc-900" : ""
      }`}
    >
      {children}
    </button>
  );
}

// 네이티브 <select>는 브라우저/OS마다 클릭·포커스 처리 방식이 미묘하게
// 달라서(특히 트랙패드 환경), 순수 버튼 기반 드롭다운으로 대체한다 -
// 툴바의 나머지 버튼들과 동작 방식이 완전히 동일해진다.
function ToolbarDropdown({
  label,
  options,
  onSelect,
}: {
  label: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        tabIndex={-1}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:border-brand"
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 flex w-32 flex-col overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-md">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              tabIndex={-1}
              className="px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-zinc-300 bg-zinc-50 p-1.5">
      <ToolbarDropdown
        label="폰트"
        options={FONT_FAMILIES}
        onSelect={(value) => {
          if (value) {
            editor.chain().focus().setFontFamily(value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
      />

      <ToolbarDropdown
        label="크기"
        options={FONT_SIZES}
        onSelect={(value) => {
          if (value) {
            editor.chain().focus().setFontSize(value).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
      />

      <input
        type="color"
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        title="글자 색"
        className="h-8 w-8 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().unsetColor().run()}
        tabIndex={-1}
        className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
      >
        색 초기화
      </button>

      <div className="mx-1 h-5 w-px bg-zinc-300" />

      <ToolbarButton
        label="굵게"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="기울임"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="밑줄"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-zinc-300" />

      <ToolbarButton
        label="글머리 기호 목록"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="번호 매기기 목록"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-zinc-300" />

      <ToolbarButton
        label="실행 취소"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="다시 실행"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

// useEditor는 렌더마다 넘어오는 옵션 객체를 이전 값과 비교해서 바뀐 게
// 있으면 editor.setOptions()를 다시 호출한다. extensions 배열의 각
// 원소는 참조 비교라 괜찮지만, editorProps처럼 매 렌더마다 새로
// 만들어지는 객체 리터럴을 넘기면 매 키 입력마다 다르다고 판단해서
// setOptions가 반복 호출되고, 그 과정에서 ProseMirror view의 setProps가
// 같이 불려 한글 조합 입력(IME) 도중 포커스/조합 상태가 끊겨 글자가 아예
// 입력되지 않는 문제가 생긴다. 컴포넌트 바깥의 고정 상수로 빼서 참조가
// 절대 바뀌지 않게 한다.
const EXTENSIONS = [StarterKit, TextStyle, Color, FontFamily, FontSize];
const EDITOR_PROPS = {
  attributes: {
    class:
      "notice-editor-content min-h-[200px] rounded-b-md border border-t-0 border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand",
  },
};

export default function RichTextEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [html, setHtml] = useState(defaultValue ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: EXTENSIONS,
    content: defaultValue ?? "",
    editorProps: EDITOR_PROPS,
    onUpdate: ({ editor }) => {
      setHtml(editor.getHTML());
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={name} value={html} readOnly />
      {editor && <Toolbar editor={editor} />}
      <div
        onMouseDown={(e) => {
          // 툴바와 본문 사이 경계 근처를 클릭했을 때, 실제로는 본문을
          // 누르려 했는데 살짝 위의 툴바 쪽 컨트롤이 눌리는 경우가 있어
          // (특히 트랙패드 등에서), 이 래퍼 자체(자식 컨트롤이 아니라)를
          // 직접 누른 경우에는 명시적으로 본문에 포커스를 준다.
          if (e.target === e.currentTarget) {
            e.preventDefault();
            editor?.chain().focus().run();
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
