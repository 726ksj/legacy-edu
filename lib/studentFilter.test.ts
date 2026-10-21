import { describe, expect, it } from "vitest";
import { NO_FILTER, UNSET, distinctOptions, filterStudents, type StudentFilter } from "./studentFilter";

const students = [
  { name: "김하늘", username: "haneul01", school: "복정고등학교", grade: "고2" },
  { name: "이도윤", username: "doyun", school: "복정고등학교", grade: "고3" },
  { name: "박서준", username: "seojun", school: "동광고등학교", grade: "고3" },
  { name: "최민아", username: "mina", school: null, grade: null },
];

const run = (patch: Partial<StudentFilter>) =>
  filterStudents(students, { ...NO_FILTER, ...patch }).map((s) => s.name);

describe("filterStudents", () => {
  it("필터가 없으면 전체", () => {
    expect(run({})).toHaveLength(4);
  });

  it("이름·아이디로 검색한다", () => {
    expect(run({ query: "하늘" })).toEqual(["김하늘"]);
    expect(run({ query: "doyun" })).toEqual(["이도윤"]);
  });

  it("대소문자를 구분하지 않는다", () => {
    expect(run({ query: "SEOJUN" })).toEqual(["박서준"]);
  });

  it("여러 단어는 모두 포함해야 한다(학교 + 학년)", () => {
    expect(run({ query: "복정 고3" })).toEqual(["이도윤"]);
    expect(run({ query: "고3 동광" })).toEqual(["박서준"]);
  });

  it("학교·학년 드롭다운 필터", () => {
    expect(run({ school: "복정고등학교" })).toEqual(["김하늘", "이도윤"]);
    expect(run({ grade: "고3" })).toEqual(["이도윤", "박서준"]);
    expect(run({ school: "복정고등학교", grade: "고3" })).toEqual(["이도윤"]);
  });

  it("학교·학년 미입력 학생만 고를 수 있다", () => {
    expect(run({ school: UNSET })).toEqual(["최민아"]);
    expect(run({ grade: UNSET })).toEqual(["최민아"]);
  });

  it("검색과 필터를 함께 적용한다", () => {
    expect(run({ query: "윤", school: "복정고등학교" })).toEqual(["이도윤"]);
    expect(run({ query: "윤", school: "동광고등학교" })).toEqual([]);
  });
});

describe("distinctOptions", () => {
  it("비어 있는 값은 빼고 가나다순으로 중복 없이", () => {
    expect(distinctOptions(students.map((s) => s.school))).toEqual(["동광고등학교", "복정고등학교"]);
    expect(distinctOptions(students.map((s) => s.grade))).toEqual(["고2", "고3"]);
  });
});
