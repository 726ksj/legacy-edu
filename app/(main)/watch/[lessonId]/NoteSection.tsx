"use client";

import { useActionState, useRef, useEffect } from "react";
import { saveNote, updateNote, deleteNote, type SaveNoteState } from "./note-actions";
import NoteCard from "@/components/notes/NoteCard";

interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
}

const initialState: SaveNoteState = {};

export default function NoteSection({
  lessonId,
  notes,
}: {
  lessonId: string;
  notes: NoteItem[];
}) {
  const boundSaveNote = saveNote.bind(null, lessonId);
  const [state, formAction, isPending] = useActionState(
    boundSaveNote,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-200 pt-6">
      <div>
        <p className="text-sm font-semibold text-zinc-700">메모장</p>
        <p className="text-xs text-zinc-400">
          마이페이지 - 나의 메모에서 언제든 다시 확인할 수 있어요.
        </p>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <textarea
          name="content"
          required
          rows={3}
          placeholder="이 강의를 들으며 남기고 싶은 메모를 적어보세요."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        />
        {state.error && (
          <p className="text-sm font-medium text-red-500">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "저장 중..." : "메모 저장"}
        </button>
      </form>

      {notes.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-700">내 메모</p>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              content={note.content}
              updateAction={updateNote.bind(null, note.id, lessonId, {})}
              deleteAction={deleteNote.bind(null, note.id, lessonId)}
              footer={
                <p className="mt-1 text-xs text-zinc-400">{note.createdAt}</p>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
