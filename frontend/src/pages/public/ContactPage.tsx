import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, AlertTriangle, Send } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Textarea, Select } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { MapContainer } from '@/components/maps/MapContainer';
import { useApp } from '@/context/AppContext';

const departments = [
  { name: 'General Administration', phone: '+977 1 4520 000', email: 'info@kmc.gov.np', hours: 'Sun–Fri, 10 AM – 5 PM' },
  { name: 'Roads & Infrastructure', phone: '+977 1 4520 101', email: 'roads@kmc.gov.np', hours: 'Sun–Fri, 10 AM – 5 PM' },
  { name: 'Sanitation', phone: '+977 1 4520 102', email: 'sanitation@kmc.gov.np', hours: 'Sun–Sat, 6 AM – 8 PM' },
  { name: 'Water Supply', phone: '+977 1 4520 103', email: 'water@kmc.gov.np', hours: '24/7 Emergency' },
];

export function ContactPage() {
  const { addToast } = useApp();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      addToast({ type: 'success', title: 'Message sent', message: 'We will get back to you within 2 business days.' });
    }, 900);
  };

  return (
    <div className="container-page py-10">
      <PageHeader title="Contact Us" subtitle="Get in touch with the municipal office or a specific department." breadcrumbs={[{ label: 'Contact' }]} />

      <div className="mb-6 rounded-2xl border border-error-200 bg-error-50 p-4 dark:border-error-900 dark:bg-error-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
          <div className="text-sm text-error-800 dark:text-error-300">
            <p className="font-semibold">Emergency Notice</p>
            <p className="mt-0.5">This contact form and complaint system are NOT for emergencies. For Police call 100, Ambulance 102, Fire Service 101.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Send us a message</h2>
            <p className="mt-1 text-sm text-ink-500">We typically respond within 2 business days.</p>
            {sent ? (
              <div className="mt-6 rounded-xl border border-success-200 bg-success-50 p-6 text-center dark:border-success-900 dark:bg-success-950/30">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-600">
                  <Send className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold text-success-800 dark:text-success-300">Message sent successfully</p>
                <p className="mt-1 text-sm text-success-700 dark:text-success-400">Thank you for reaching out. We will respond soon.</p>
                <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full name" required placeholder="Your name" />
                  <Input label="Email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Phone" placeholder="+977 98XXXXXXXX" />
                  <Select label="Subject" placeholder="Select subject" options={[
                    { value: 'general', label: 'General enquiry' },
                    { value: 'complaint', label: 'Complaint about service' },
                    { value: 'feedback', label: 'Feedback' },
                    { value: 'technical', label: 'Technical support' },
                  ]} />
                </div>
                <Textarea label="Message" required placeholder="Describe your enquiry…" className="min-h-[140px]" />
                <Button type="submit" loading={loading} leftIcon={<Send className="h-4 w-4" />}>Send message</Button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Municipal Office</h3>
            <div className="mt-3 space-y-3 text-sm">
              <p className="flex items-start gap-2.5 text-ink-600 dark:text-ink-300">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" /> Kathmandu Metropolitan City, Bagdurbar, Kathmandu 44600
              </p>
              <p className="flex items-center gap-2.5 text-ink-600 dark:text-ink-300">
                <Phone className="h-4 w-4 shrink-0 text-primary-600" /> <a href="tel:+97714520000">+977 1 4520 000</a>
              </p>
              <p className="flex items-center gap-2.5 text-ink-600 dark:text-ink-300">
                <Mail className="h-4 w-4 shrink-0 text-primary-600" /> <a href="mailto:info@kmc.gov.np">info@kmc.gov.np</a>
              </p>
              <p className="flex items-start gap-2.5 text-ink-600 dark:text-ink-300">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" /> Sun–Fri, 10:00 AM – 5:00 PM (Closed Sat & public holidays)
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Department Contacts</h3>
            <div className="mt-3 space-y-3">
              {departments.map((d) => (
                <div key={d.name} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{d.name}</p>
                  <div className="mt-1.5 space-y-1 text-xs text-ink-500">
                    <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {d.phone}</p>
                    <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {d.email}</p>
                    <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {d.hours}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 p-2">
        <MapContainer height="h-72" markers={[{ id: 'office', lat: 27.7008, lng: 85.3186, status: 'closed', label: 'Municipal Office' }]} />
      </Card>
    </div>
  );
}
