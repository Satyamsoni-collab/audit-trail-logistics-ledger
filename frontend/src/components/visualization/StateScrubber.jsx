
import React, { useEffect } from "react";

function StateScrubber({ events = [], currentIndex = 0, onChange }) {
  const safeIndex = Math.max(
    0,
    Math.min(Math.max(events.length - 1, 0), Number(currentIndex) || 0)
  );

  const currentEvent = events[safeIndex];

  useEffect(() => {
    if (!events.length || typeof onChange !== "function") return;

    const handleKeyDown = (event) => {
      const target = event.target;

      // Let form controls handle their own keyboard input.
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChange(Math.max(0, safeIndex - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChange(Math.min(events.length - 1, safeIndex + 1));
      } else if (event.key === "Home") {
        event.preventDefault();
        onChange(0);
      } else if (event.key === "End") {
        event.preventDefault();
        onChange(events.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeIndex, onChange, events.length]);

  if (!events.length) {
    return (
      <section className="state-scrubber">
        <h3>State Scrubbing</h3>
        <p>No shipment history is available to inspect.</p>
      </section>
    );
  }

  if (!currentEvent) return null;

  const eventType = currentEvent.type || currentEvent.event || "UNKNOWN_EVENT";
  const eventTime = currentEvent.time || currentEvent.timestamp || "Time unavailable";
  const eventState = currentEvent.state || currentEvent.description || "State information unavailable";

  return (
    <section className="state-scrubber">
      <div className="scrubber-header">
        <div>
          <h3>State Scrubbing</h3>
          <p>Rewind shipment history to inspect previous states.</p>
        </div>
        <span>{eventTime}</span>
      </div>

      <input
        type="range"
        min={0}
        max={events.length - 1}
        step={1}
        value={safeIndex}
        onChange={(event) => onChange(Number(event.target.value))}
        className="scrubber-slider"
        aria-label="Shipment history state"
        aria-valuetext={`${eventTime}: ${eventState}`}
      />

      <div className="scrubber-labels">
        {events.map((item, index) => (
          <span key={item.id || item._id || `${item.type || item.event}-${index}`}>
            {item.time || item.timestamp || `Event ${index + 1}`}
          </span>
        ))}
      </div>

      <div className="scrubber-state" aria-live="polite">
        <span>Historical Position</span>
        <strong>{safeIndex + 1} of {events.length}</strong>

        <span>Selected Event</span>
        <strong>{eventType}</strong>

        <span>Shipment State</span>
        <strong>{eventState}</strong>
      </div>

      <p className="scrubber-keyboard-help">
        Keyboard: ← Previous · → Next · Home First · End Latest
      </p>
    </section>
  );
}

export default StateScrubber;
