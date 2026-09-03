export interface QuestionRow {
  id: string;
  parent_id: string | null;
  lesson_id: string;
  profile_id: string;
  content: string;
  created_at: string;
  question_read_at: string | null;
  answer_read_at: string | null;
}

export interface QuestionMessage {
  id: string;
  profileId: string;
  content: string;
  createdAt: string;
  questionReadAt: string | null;
  answerReadAt: string | null;
}

export interface QuestionThread {
  id: string; // 최초 질문(root)의 id - 스레드 전체를 가리키는 id로 쓴다
  lessonId: string;
  studentProfileId: string;
  messages: QuestionMessage[]; // 최초 질문 + 답변/후속 질문, 시간순
}

// lessons/lesson별로 흩어져 있는 questions 행들(최초 질문 + 그에 딸린
// 답변/후속 질문)을 스레드 단위로 묶는다. rows에는 관련된 모든 행(부모와
// 자식 전부)이 들어있어야 한다.
export function buildThreads(rows: QuestionRow[]): QuestionThread[] {
  const roots = rows.filter((row) => !row.parent_id);
  const childrenByParent = new Map<string, QuestionRow[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    const list = childrenByParent.get(row.parent_id) ?? [];
    list.push(row);
    childrenByParent.set(row.parent_id, list);
  }

  const toMessage = (row: QuestionRow): QuestionMessage => ({
    id: row.id,
    profileId: row.profile_id,
    content: row.content,
    createdAt: row.created_at,
    questionReadAt: row.question_read_at,
    answerReadAt: row.answer_read_at,
  });

  return roots.map((root) => {
    const children = (childrenByParent.get(root.id) ?? []).sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return {
      id: root.id,
      lessonId: root.lesson_id,
      studentProfileId: root.profile_id,
      messages: [toMessage(root), ...children.map(toMessage)],
    };
  });
}

// 스레드의 가장 최근 메시지를 학생이 남겼다면, 스태프의 응답을 기다리고
// 있는 상태로 본다.
export function threadNeedsStaffReply(thread: QuestionThread): boolean {
  const last = thread.messages[thread.messages.length - 1];
  return last.profileId === thread.studentProfileId;
}

// 스태프가 아직 확인 안 한, 학생이 쓴 메시지 개수.
export function countUnreadFromStudent(thread: QuestionThread): number {
  return thread.messages.filter(
    (message) =>
      message.profileId === thread.studentProfileId &&
      !message.questionReadAt,
  ).length;
}

// 학생이 아직 확인 안 한, 스태프가 쓴 메시지 개수.
export function countUnreadFromStaff(thread: QuestionThread): number {
  return thread.messages.filter(
    (message) =>
      message.profileId !== thread.studentProfileId && !message.answerReadAt,
  ).length;
}
