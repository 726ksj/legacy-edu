"use client";

import { useState } from "react";
import NoteCard from "@/components/notes/NoteCard";

export interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
  studentName: string;
  studentUsername: string;
}

export interface LessonItem {
  id: string;
  orderNo: number;
  title: string;
  description: string | null;
  notes: NoteItem[];
}

interface UpdateResult {
  error?: string;
  success?: boolean;
}

export default function LessonNotesList({
  lessons,
  updateAction,
}: {
  lessons: LessonItem[];
  updateAction: (id: string, formData: FormData) => Promise<UpdateResult>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {lessons.map((lesson) => (
        <LessonNotesRow
          key={lesson.id}
          lesson={lesson}
          updateAction={updateAction}
        />
      ))}
    </div>
  );
}

function LessonNotesRow({
  lesson,
  updateAction,
}: {
  lesson: LessonItem;
  updateAction: (id: string, formData: FormData) => Promise<UpdateResult>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            {lesson.title}
          </p>
          {lesson.description && (
            <p className="mt-1 text-xs text-zinc-500">{lesson.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          질문 보기 ({lesson.notes.length}) {isOpen ? "▲" : "▼"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-3 border-t border-zinc-100 pt-3">
          {lesson.notes.length === 0 && (
            <p className="text-center text-sm text-zinc-400">
              학생이 남긴 질문이 없습니다.
            </p>
          )}
          {lesson.notes.map((note) => (
            <NoteCard
              key={note.id}
              content={note.content}
              updateAction={(formData) => updateAction(note.id, formData)}
              header={
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-zinc-500">
                    {note.studentName} ({note.studentUsername})
                  </p>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {note.createdAt}
                  </span>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
