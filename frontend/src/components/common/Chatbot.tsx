import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Phone, AlertTriangle, Bot } from 'lucide-react';
import { cn } from '../../utils/format';

interface Msg {
  id: string;
  from: 'bot' | 'user';
  text: string;
}

const quickPrompts = [
  'How do I report a pothole?',
  'Track my complaint',
  'What do statuses mean?',
  'Emergency help',
];

const botReply = (q: string): string => {
  const t = q.toLowerCase();
  if (t.includes('pothole') || t.includes('report')) return 'To report a pothole, go to Report Issue, choose "Potholes & Roads", describe the problem, mark the location on the map, and attach a photo. The Roads & Infrastructure department will handle it.';
  if (t.includes('track')) return 'You can track any complaint using its tracking ID (e.g. KMC-2024-001284) on the Track Complaint page, or view all your complaints from your dashboard.';
  if (t.includes('status')) return 'Statuses: Submitted (received), Under Review (being verified), Assigned (department handling it), In Progress (work started), Resolved (fixed, awaiting your confirmation), Closed (confirmed).';
  if (t.includes('emergency')) return 'This system is NOT for emergencies. For Police call 100, Ambulance 102, Fire Service 101. Please use these numbers for urgent safety situations.';
  if (t.includes('hello') || t.includes('hi')) return 'Hello! I am CivicBot, your civic support assistant. I can help you report issues, track complaints, and answer FAQs. How can I help?';
  return "I can help with reporting complaints, tracking status, understanding the process, and FAQs. For anything else, you can switch to human support. What would you like to do?";
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 'm0', from: 'bot', text: 'Hi! I am CivicBot. I can help you report issues, track complaints, and answer questions. How can I assist you today?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing, open]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, from: 'user', text };
    setMsgs((p) => [...p, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((p) => [...p, { id: `b-${Date.now()}`, from: 'bot', text: botReply(text) }]);
    }, 700);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-float transition hover:bg-primary-700 hover:scale-105 lg:bottom-6"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-success-500 ring-2 ring-white" />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-40 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-float animate-slide-up lg:bottom-24 dark:border-ink-700 dark:bg-ink-900">
          <div className="flex items-center justify-between border-b border-ink-100 bg-gradient-to-r from-primary-600 to-accent-600 px-4 py-3 text-white dark:border-ink-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">CivicBot Assistant</p>
                <p className="flex items-center gap-1 text-[10px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-300" /> Online · AI-assisted
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/20" aria-label="Close chat">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50/50 p-3 scrollbar-thin dark:bg-ink-950/50">
            {msgs.map((m) => (
              <div key={m.id} className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    m.from === 'user'
                      ? 'rounded-br-md bg-primary-600 text-white'
                      : 'rounded-bl-md bg-white text-ink-700 shadow-soft dark:bg-ink-800 dark:text-ink-200'
                  )}
                >
                  {m.from === 'bot' && <Sparkles className="mb-1 h-3.5 w-3.5 text-accent-500" />}
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2.5 shadow-soft dark:bg-ink-800">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-ink-100 bg-white px-3 py-2 dark:border-ink-800 dark:bg-ink-900">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-ink-200 px-2.5 py-1 text-[11px] text-ink-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-ink-700 dark:text-ink-300"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                className="input-base h-9 flex-1"
                aria-label="Message"
              />
              <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700" aria-label="Send message">
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between text-[10px] text-ink-400">
              <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Not for emergencies</span>
              <button className="flex items-center gap-1 font-medium text-primary-600 hover:underline">
                <Phone className="h-3 w-3" /> Human support
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
