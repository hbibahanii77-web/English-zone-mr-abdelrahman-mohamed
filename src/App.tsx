import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { isSupabaseConfigured, signOut, supabase } from './lib/supabase'
import InternalApp from './InternalApp'

const courses = [
  {
    title: 'English Foundations',
    level: 'Beginner',
    detail: 'Build confident everyday English from the ground up.',
    progress: 64,
    lessons: 12,
    color: 'blue',
  },
  {
    title: 'Speak with Confidence',
    level: 'Intermediate',
    detail: 'Practice real conversations, grammar and pronunciation.',
    progress: 28,
    lessons: 18,
    color: 'lavender',
  },
]

function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-mark"><BookOpen size={20} /></span>
      <span>
        English <b>Zone</b>
        <small>Mr. Abdelrahman Mohamed</small>
      </span>
    </Link>
  )
}

function PublicHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <Brand />
      <button className="icon-button mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? 'public-nav open' : 'public-nav'}>
        <a href="#courses">Courses</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
        <Link className="text-link" to="/login">Student Login <ArrowRight size={16} /></Link>
        <Link className="text-link teacher-link" to="/teacher-login">Teacher Login <ArrowRight size={16} /></Link>
        <Link className="button button-small" to="/register">Create Account</Link>
      </nav>
    </header>
  )
}

function Metric({ n, t }: { n: string; t: ReactNode }) {
  return (
    <div>
      <strong>{n}</strong>
      <span>{t}</span>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="feature-card">
      <span className="feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <ArrowRight className="feature-arrow" size={18} />
    </article>
  )
}

function Field({
  label,
  placeholder,
  type = 'text',
  name,
  required = true,
}: {
  label: string
  placeholder: string
  type?: string
  name?: string
  required?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name ?? label.toLowerCase().replace(/\s+/g, '_')}
        required={required}
        type={type}
        placeholder={placeholder}
      />
    </label>
  )
}

function Home() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> A calmer way to learn English</div>
            <h1>
              Your next chapter <span>starts here.</span>
            </h1>
            <p>
              Build real confidence with a focused learning space designed around your progress, your pace, and your goals.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/register">Create Student Account <ArrowRight size={18} /></Link>
              <a className="button button-ghost" href="#courses">Explore Courses</a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack"><i>R</i><i>M</i><i>S</i><i>+</i></div>
              <span>Learning together, one lesson at a time</span>
            </div>
          </div>

          <div className="hero-art">
            <div className="art-note note-one">A B C</div>
            <div className="art-note note-two"><Check size={17} /> Keep going!</div>
            <div className="book-shape">
              <div className="page page-left"><span>learn</span><strong>better</strong></div>
              <div className="page page-right"><span>grow</span><strong>brighter</strong></div>
            </div>
            <div className="art-star">✦</div>
            <div className="art-bubble">Hello!<br /><b>Let's learn.</b></div>
            <span className="dot dot-a" />
            <span className="dot dot-b" />
            <span className="dot dot-c" />
          </div>
        </section>

        <section className="metrics">
          <Metric n="01" t={<>Structured<br />Courses</>} />
          <Metric n="02" t={<>Online<br />Exams</>} />
          <Metric n="03" t={<>Student<br />Progress</>} />
          <Metric n="04" t={<>Teacher<br />Support</>} />
        </section>

        <section className="section" id="courses">
          <div className="section-heading">
            <div>
              <div className="eyebrow">A clear path forward</div>
              <h2>Everything you need<br /><em>to learn better.</em></h2>
            </div>
            <p>From your first hello to your next big milestone, every part of your learning journey lives in one thoughtful space.</p>
          </div>

          <div className="feature-grid">
            <Feature icon={<BookOpen />} title="Organized Courses" text="Follow a clear path with lessons that make sense." />
            <Feature icon={<ClipboardCheck />} title="Online Exams" text="Practice with structured evaluations and immediate progress tracking." />
            <Feature icon={<ShieldCheck />} title="Teacher Support" text="Stay connected with responsive guidance and meaningful feedback." />
          </div>
        </section>
      </main>
    </>
  )
}

function Auth({ teacher = false }: { teacher?: boolean }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setMessage('Connect Supabase to enable secure sign-in.')
      return
    }

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const studentCode = String(form.get('student_code') ?? '').trim()

    setLoading(true)
    setMessage('')

    try {
      if (teacher) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profileError) throw profileError
        if (profile.role !== 'teacher') throw new Error('This account is not a teacher account.')

        navigate('/teacher/dashboard')
        return
      }

      if (mode === 'code') {
        if (!studentCode || !password) throw new Error('Student code and password are required.')

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('student_code', studentCode)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile?.email) throw new Error('Student code not found.')

        const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password })
        if (error) throw error

        navigate('/student/dashboard')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      navigate('/student/dashboard')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand"><Brand /></div>
      <div className="auth-layout">
        <div className="auth-intro">
          <div className="eyebrow"><Sparkles size={15} /> {teacher ? 'Teacher workspace' : 'Your learning space'}</div>
          <h1>{teacher ? <>Lead the next<br /><span>breakthrough.</span></> : <>Ready to improve<br /><span>your English?</span></>}</h1>
          <p>{teacher ? 'Everything you need to guide students, organize courses and celebrate progress.' : 'Sign in to continue your lessons, see your progress and stay close to your goals.'}</p>
          <div className="auth-line"><Check size={16} /> Your progress is saved securely</div>
          <div className="auth-line"><Check size={16} /> Learn at your own pace</div>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            {!teacher && (
              <>
                <button type="button" className={mode === 'email' ? 'active' : ''} onClick={() => setMode('email')}>Email & Password</button>
                <button type="button" className={mode === 'code' ? 'active' : ''} onClick={() => setMode('code')}>Student Code</button>
              </>
            )}
            {teacher && <span>Teacher Access</span>}
          </div>

          <form onSubmit={submit}>
            {teacher || mode === 'code' ? (
              teacher ? (
                <>
                  <Field label="Email address" placeholder="teacher@example.com" type="email" name="email" />
                  <Field label="Password" placeholder="Enter your password" type="password" name="password" />
                </>
              ) : (
                <>
                  <Field label="Student Code" placeholder="EZ-123456" name="student_code" />
                  <Field label="Password" placeholder="Enter your password" type="password" name="password" />
                </>
              )
            ) : (
              <>
                <Field label="Email address" placeholder="you@example.com" type="email" name="email" />
                <Field label="Password" placeholder="Enter your password" type="password" name="password" />
              </>
            )}

            <button className="button full-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'} <ArrowRight size={18} />
            </button>

            {message && <div className="notice error">{message}</div>}
          </form>

          {!teacher && <p className="auth-bottom">New to English Zone? <Link to="/register">Create an account</Link></p>}
          {teacher && <p className="auth-bottom"><Link to="/login">Student login</Link></p>}
        </div>
      </div>

      <p className="auth-foot">{isSupabaseConfigured ? 'Connected to Supabase' : 'Connect Supabase to enable secure sign-in.'}</p>
    </div>
  )
}

function Register() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setMessage('Connect Supabase to create your account.')
      return
    }

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const fullName = String(form.get('full_name') ?? '').trim()
    const phone = String(form.get('phone') ?? '').trim()
    const educationalLevel = String(form.get('educational_level') ?? '').trim()

    if (!email || !password || !fullName) {
      setMessage('Please fill in your name, email, and password.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            educational_level: educationalLevel,
          },
        },
      })

      if (error) throw error
      setMessage('Account created. Please check your email and then sign in.')
      setTimeout(() => navigate('/login'), 1200)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand"><Brand /></div>
      <div className="register-card">
        <div className="eyebrow"><GraduationCap size={15} /> Start your journey</div>
        <h1>Create your student account.</h1>
        <p className="muted">Your account is the first step. Course access is activated after payment review.</p>

        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Full name" placeholder="Your full name" name="full_name" />
            <Field label="Phone number" placeholder="01xxxxxxxxx" type="tel" name="phone" required={false} />
            <Field label="Email address" placeholder="you@example.com" type="email" name="email" />
            <Field label="Educational level" placeholder="Choose your level" name="educational_level" required={false} />
            <Field label="Password" placeholder="At least 8 characters" type="password" name="password" />
          </div>

          <button className="button full-button" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'} <ArrowRight size={18} />
          </button>

          {message && <div className="notice success">{message}</div>}
        </form>

        <p className="auth-bottom">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  )
}

function Sidebar({ teacher = false }: { teacher?: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const items = teacher
    ? ['Dashboard', 'Students', 'Courses', 'Payments', 'Attendance', 'Exams', 'Grades', 'Announcements', 'Settings']
    : ['Dashboard', 'My Learning', 'My Attendance', 'My Exams', 'My Grades', 'My Progress', 'Payments', 'Announcements', 'Profile', 'Support']

  return (
    <aside className="sidebar">
      <div className="side-brand"><Brand /></div>
      <div className="side-label">Workspace</div>
      <nav className="side-nav">
        {items.map((item, i) => (
          <NavLink key={item} to={teacher ? '/teacher' : '/student'} className={i === 0 ? 'active' : ''}>
            {i === 0 ? <LayoutDashboard size={17} /> : i === 1 ? <BookOpen size={17} /> : <span className="nav-dot" />}
            {item}
          </NavLink>
        ))}
      </nav>

      {!teacher && (
        <div className="learning-tree">
          <button onClick={() => setExpanded(!expanded)}><BookOpen size={16} /> My Learning <ChevronDown className={expanded ? 'rotate' : ''} size={16} /></button>
          {expanded && courses.map((course) => (
            <div className="tree-course" key={course.title}>
              <b>{course.title}</b>
              <span>Lesson 1 · Getting started</span>
              <span>Lesson 2 · Vocabulary</span>
              <span>Lesson 3 · Grammar</span>
            </div>
          ))}
        </div>
      )}

      <button className="logout" onClick={() => { void signOut(); window.location.href = '/' }}>
        <LogIn size={17} /> Log out
      </button>
    </aside>
  )
}

function Dashboard({ teacher = false }: { teacher?: boolean }) {
  const stats = teacher
    ? [['42', 'Total Students'], ['2', 'Active Courses'], ['3', 'Pending Payments'], ['8', 'Total Exams']]
    : [['02', 'My Courses'], ['86%', 'Attendance'], ['78%', 'Average Grade'], ['06', 'Exams']]

  return (
    <div className="app-shell">
      <Sidebar teacher={teacher} />
      <main className="dashboard">
        <header className="dash-header">
          <div>
            <span className="breadcrumb">{teacher ? 'Teacher portal' : 'Student space'} /</span>
            <h1>{teacher ? 'Good morning, Abdelrahman.' : 'Good morning, Sarah.'}</h1>
          </div>
          <div className="dash-user">
            <button className="icon-button"><MessageCircle size={19} /></button>
            <span className="user-avatar">{teacher ? 'AM' : 'SA'}</span>
            <span>{teacher ? 'Mr. Abdelrahman' : 'Sarah Ahmed'}</span>
            <ChevronDown size={16} />
          </div>
        </header>

        <div className="dash-content">
          <div className="welcome-card">
            <div>
              <div className="eyebrow">{teacher ? 'Your classroom at a glance' : 'Keep your momentum'}</div>
              <h2>{teacher ? 'Every lesson is a chance to make an impact.' : 'A little progress is still progress.'}</h2>
              <p>{teacher ? 'You have 3 payment requests waiting for your review.' : 'You are 64% through English Foundations. Keep going!'}</p>
            </div>
            <div className="welcome-art">{teacher ? <Users size={66} /> : <span>64<small>%</small></span>}</div>
          </div>

          <div className="stats-row">
            {stats.map(([value, label]) => (
              <div className="stat-card" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <div className="stat-line" />
              </div>
            ))}
          </div>

          {teacher ? <TeacherPanel /> : (
            <>
              <div className="content-heading">
                <div>
                  <span className="eyebrow">Your courses</span>
                  <h2>Continue learning</h2>
                </div>
                <button className="text-link">View all <ArrowRight size={16} /></button>
              </div>

              <div className="course-list">
                {courses.map((course) => (
                  <article className="course-card" key={course.title}>
                    <div className={`course-symbol ${course.color}`}><BookOpen size={25} /></div>
                    <div className="course-main">
                      <div className="course-top">
                        <span className="pill">{course.level}</span>
                        <span className="muted">{course.lessons} lessons</span>
                      </div>
                      <h3>{course.title}</h3>
                      <p>{course.detail}</p>
                      <div className="course-progress">
                        <span>{course.progress}% complete</span>
                        <div className="progress-bar"><i style={{ width: `${course.progress}%` }} /></div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function TeacherPanel() {
  return (
    <>
      <div className="content-heading">
        <div>
          <span className="eyebrow">Needs your attention</span>
          <h2>Recent activity</h2>
        </div>
        <button className="button button-small">Add course <ArrowRight size={15} /></button>
      </div>

      <div className="activity-table">
        <div className="table-row table-head">
          <span>Student</span>
          <span>Activity</span>
          <span>Status</span>
          <span>Date</span>
        </div>

        {[
          ['Nour Hassan', 'Payment request · Foundations', 'Pending', 'Today'],
          ['Omar Ali', 'Completed Exam · Unit 2', 'Reviewed', 'Yesterday'],
          ['Mariam Samir', 'New student registration', 'Active', 'Aug 24'],
        ].map((row) => (
          <div className="table-row" key={row[0]}>
            <span className="student-cell"><i>{row[0][0]}</i>{row[0]}</span>
            <span>{row[1]}</span>
            <span><b className={`status ${row[2].toLowerCase()}`}>{row[2]}</b></span>
            <span>{row[3]}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/teacher-login" element={<Auth teacher />} />
      <Route path="/register" element={<Register />} />
      <Route path="/student/*" element={<InternalApp role="student" />} />
      <Route path="/teacher/*" element={<InternalApp role="teacher" />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
