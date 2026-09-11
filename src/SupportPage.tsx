import { FormEvent, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
export default function SupportPage() {
  const [message, setMessage] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return setMessage('Connect Supabase to save your support message.')
    const user = await supabase.auth.getUser()
    const form = new FormData(event.currentTarget)
    const result = await supabase.from('support_messages').insert({ student_id: user.data.user?.id, subject: form.get('subject'), message: form.get('message') })
    setMessage(result.error?.message ?? 'Support message sent successfully.')
  }
  return <><div className="page-heading"><div><span className="eyebrow">Teacher support</span><h2>Support</h2></div></div><div className="support-grid"><div className="panel support-contact"><MessageCircle size={28} /><h3>Mr. Abdelrahman Mohamed</h3><p>For course access, payment review, or lesson questions, send a message.</p><b>Contact information</b><span>Available through English Zone support.</span></div><form className="panel form-panel" onSubmit={submit}><h3>Send a message</h3><label className="field"><span className="form-label">Subject</span><input name="subject" required /></label><label className="field"><span className="form-label">Message</span><textarea name="message" required /></label><button className="button">Send Message</button>{message && <div className="notice success">{message}</div>}</form></div></>
}
