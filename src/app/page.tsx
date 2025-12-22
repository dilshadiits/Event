'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Calendar, QrCode, ArrowRight, Link as LinkIcon, Check, Trash2, Trophy, LogOut } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  date: string;
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const copyLink = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    const url = `${window.location.origin}/register/${id}`;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for iOS Safari and older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Show alert as last resort
      // alert(`Copy this link: ${url}`);
    }
  };

  const deleteEvent = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this event? All attendees will be removed.')) return;

    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      // Only set events if response is an array (not an error object)
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        console.error('API error:', data.error);
        setEvents([]);
      }
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName || !newEventDate) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEventName, date: newEventDate }),
      });
      if (res.ok) {
        setNewEventName('');
        setNewEventDate('');
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8 md:space-y-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Event <span className="text-blue-500">Manager</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Create events, generate QR codes, and track attendance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
          <Link
            href="/awards"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all shadow-lg hover:shadow-purple-500/20 font-medium text-sm sm:text-base"
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Awards</span>
          </Link>
          <Link
            href="/scan"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all shadow-lg hover:shadow-blue-500/20 font-medium text-sm sm:text-base"
          >
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Scan</span>
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('app_auth_token');
              window.dispatchEvent(new Event('storage'));
            }}
            className="flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full transition-all border border-red-500/30 font-medium text-sm sm:text-base"
            title="Logout"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Create Event Section */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-500" />
          Create New Event
        </h2>
        <form onSubmit={createEvent} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-sm font-medium text-muted-foreground">Event Name</label>
            <input
              type="text"
              placeholder="e.g. Tech Conference 2025"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex-1 space-y-2 w-full">
            <label className="text-sm font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [color-scheme:dark]"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-lg font-bold transition-colors"
          >
            Create
          </button>
        </form>
      </section>

      {/* Events List */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-500" />
          Your Events
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
            No events found. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group block bg-card hover:bg-muted/50 border border-border rounded-xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Calendar className="w-6 h-6" />
                  </div>
                  {/* The original ArrowRight is removed from here */}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{event.name}</h3>
                <p className="text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <span className="text-sm text-blue-400 font-medium group-hover:underline flex items-center gap-1">
                    Manage Event <ArrowRight className="w-4 h-4" />
                  </span>
                  <button
                    onClick={(e) => copyLink(e, event.id)}
                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full transition-all"
                    title="Copy Registration Link"
                  >
                    {copiedId === event.id ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => deleteEvent(e, event.id)}
                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
