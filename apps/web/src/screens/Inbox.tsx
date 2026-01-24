import React, { useEffect, useState } from "react";
import { getInbox, InboxResponse } from "../api";
import EventRow from "../components/EventRow";

const POLL_INTERVAL_MS = 10000;

type InboxProps = {
  userId: number;
};

const Inbox = ({ userId }: InboxProps) => {
  const [events, setEvents] = useState<InboxResponse["events"]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = async () => {
    try {
      const data = await getInbox(userId);
      setEvents(data.events);
      setError(null);
    } catch (fetchError) {
      setError("Unable to load inbox.");
    }
  };

  useEffect(() => {
    loadInbox();
    const timer = window.setInterval(loadInbox, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [userId]);

  return (
    <section className="screen">
      <div className="list-section">
        <h3>Events</h3>
        {error ? <div className="error-text">{error}</div> : null}
        <div className="list">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
          {events.length === 0 ? <div className="empty-state">No activity yet.</div> : null}
        </div>
      </div>
    </section>
  );
};

export default Inbox;
