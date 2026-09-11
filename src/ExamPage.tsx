import { FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { supabase } from './lib/supabase'

type Row = Record<string, any>
export default function ExamPage() {
  const { examId } = useParams()
  const [exam, setExam] = useState<Row | null>(null)
  const [answers, setAnswers] = useState<Row>({})
  const [message, setMessage] = useState('')
  useState(() => { if (supabase) supabase.from('exams').select('id,name,total_marks,duration_minutes,questions(id,prompt,options,correct_answer,marks)').eq('id', examId).single().then(({ data }) => setExam(data)) })
  if (!exam) return <div className="panel state">Loading exam...</div>
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return setMessage('Connect Supabase to submit this exam.')
    const user = await supabase.auth.getUser()
    let score = 0
    for (const question of exam.questions ?? []) if (answers[question.id] === question.correct_answer) score += Number(question.marks ?? 1)
    const total = Number(exam.total_marks) || (exam.questions ?? []).reduce((sum: number, q: Row) => sum + Number(q.marks ?? 1), 0)
    const result = await supabase.from('exam_submissions').upsert({ exam_id: exam.id, student_id: user.data.user?.id, answers, score, percentage: total ? score / total * 100 : 0, result: score / total >= .5 ? 'Passed' : 'Failed' })
    setMessage(result.error?.message ?? 'Exam submitted successfully. Your result is saved.')
  }
  return <><Link className="back-link" to="/student/exams"><ArrowLeft size={16} /> Back to exams</Link><div className="page-heading"><div><span className="eyebrow">{exam.duration_minutes ?? '-'} minutes · {exam.total_marks} marks</span><h2>{exam.name}</h2></div></div><form className="exam-form" onSubmit={submit}>{(exam.questions ?? []).map((question: Row, index: number) => <fieldset className="question panel" key={question.id}><legend>{index + 1}. {question.prompt}</legend>{(question.options ?? []).map((option: string) => <label key={option}><input type="radio" required name={question.id} value={option} onChange={() => setAnswers({ ...answers, [question.id]: option })} /> {option}</label>)}</fieldset>)}<button className="button">Submit Exam <Check size={17} /></button>{message && <div className="notice success">{message}</div>}</form></>
}
