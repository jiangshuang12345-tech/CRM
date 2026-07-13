import type { LessonRecord } from './types'

// 试听课报告外链（点击「试听报告」跳转的原型页面）
export const TRIAL_REPORT_URL = 'https://jiangshuang12345-tech.github.io/CT-Trial-Report/'

// 某学生的全部课时
export function studentLessons(lessons: LessonRecord[], studentId: string): LessonRecord[] {
  return lessons.filter((l) => l.studentId === studentId)
}

// 某学生「已完课」的课时，按完课时间倒序（体验课 + 正式课）
export function completedLessons(lessons: LessonRecord[], studentId: string): LessonRecord[] {
  return studentLessons(lessons, studentId)
    .filter((l) => l.status === '已完课')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

// 某学生最近一次带报告的体验课（用于一期临时入口）
export function latestTrialReport(lessons: LessonRecord[], studentId: string): LessonRecord | null {
  const trials = completedLessons(lessons, studentId).filter((l) => l.lessonType === '体验课' && l.report)
  return trials[0] ?? null
}

// 报告类型：体验课 → Trial Report，正式课 → Lesson Report
export function reportKind(l: LessonRecord): 'Trial Report' | 'Lesson Report' {
  return l.lessonType === '体验课' ? 'Trial Report' : 'Lesson Report'
}
