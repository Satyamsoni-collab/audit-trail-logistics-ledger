
import React from "react";

const shipmentEvents = [
  {
    id: 1,
    time: "08:00",
    type: "CONTAINER_CREATED",
    description: "Shipment container was created.",
    state: "Container created",
  },
  {
    id: 2,
    time: "10:30",
    type: "LOADED_ON_SHIP",
    description: "Container was loaded onto the ship.",
    state: "Container loaded on ship",
  },
  {
    id: 3,
    time: "14:00",
    type: "TEMPERATURE_SPIKE",
    description: "Temperature increased above the normal range.",
    state: "Temperature alert detected",
  },
  {
    id: 4,
    time: "18:00",
    type: "ARRIVED_AT_PORT",
    description: "Container arrived at the destination port.",
    state: "Container arrived at port",
  },
];

const getEventSeverity = (eventType) => {
  if (eventType === "TEMPERATURE_SPIKE") {
    return "High";
  }

  if (eventType === "LOADED_ON_SHIP") {
    return "Medium";
  }

  return "Normal";
};

const getEventDuration = (index) => {
  if (index === 0) {
    return "Start";
  }

  const previous = shipmentEvents[index - 1];
  const current = shipmentEvents[index];

  const toMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const difference =
    toMinutes(current.time) - toMinutes(previous.time);

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

function ShipmentTimeline({ selectedEvent, onSelectEvent }) {
  const [filter, setFilter] = React.useState("ALL");
  const [sortBy, setSortBy] = React.useState("TIME");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copyMessage, setCopyMessage] = React.useState("");
  const [exportMessage, setExportMessage] = React.useState("");

  const query = searchQuery.trim().toLowerCase();

  const filteredEvents = shipmentEvents.filter((event) => {
    const matchesFilter =
      filter === "ALL" || event.type === filter;

    const matchesSearch =
      !query ||
      event.type.toLowerCase().includes(query) ||
      event.time.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.state.toLowerCase().includes(query) ||
      getEventSeverity(event.type).toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === "SEVERITY") {
      const severityRank = {
        High: 3,
        Medium: 2,
        Normal: 1,
      };

      return (
        severityRank[getEventSeverity(b.type)] -
        severityRank[getEventSeverity(a.type)]
      );
    }

    return a.time.localeCompare(b.time);
  });

  const eventCount = filteredEvents.length;

  const severityCounts = filteredEvents.reduce(
    (counts, event) => {
      const severity = getEventSeverity(event.type);
      counts[severity] += 1;
      return counts;
    },
    { High: 0, Medium: 0, Normal: 0 }
  );

  const handleCopyEvent = async () => {
    if (!selectedEvent) {
      setCopyMessage("Select an event first.");
      return;
    }

    const details = [
      `Event: ${selectedEvent.type}`,
      `Time: ${selectedEvent.time}`,
      `Severity: ${getEventSeverity(selectedEvent.type)}`,
      `Description: ${selectedEvent.description}`,
      `Reconstructed State: ${selectedEvent.state}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setCopyMessage("Event details copied successfully.");
    } catch {
      setCopyMessage(
        "Unable to copy. Check browser clipboard permissions."
      );
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Event Type",
      "Time",
      "Description",
      "Severity",
      "Reconstructed State",
    ];

    // Export events matching the active filter, search, and sort.
    const rows = sortedEvents.map((event) => [
      event.type,
      event.time,
      event.description,
      getEventSeverity(event.type),
      event.state,
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      filter === "ALL" && !query
        ? "shipment-timeline.csv"
        : "shipment-timeline-filtered.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    setExportMessage(
      `Exported ${sortedEvents.length} shipment event(s) successfully.`
    );
  };

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setExportMessage("");
  };

  return (
    <div className="shipment-timeline">
      <div className="timeline-header">
        <div>
          <h3>Event Timeline</h3>
          <span>Shipment History</span>
        </div>

        <div className="timeline-summary">
          <span>Events</span>
          <strong>{eventCount}</strong>
        </div>
      </div>

      <div className="severity-summary">
        <div className="severity-summary-card high">
          <span>High</span>
          <strong>{severityCounts.High}</strong>
        </div>

        <div className="severity-summary-card medium">
          <span>Medium</span>
          <strong>{severityCounts.Medium}</strong>
        </div>

        <div className="severity-summary-card normal">
          <span>Normal</span>
          <strong>{severityCounts.Normal}</strong>
        </div>
      </div>

      <div className="timeline-copy-action">
        <button
          type="button"
          className="copy-event-button"
          onClick={handleCopyEvent}
        >
          Copy Selected Event
        </button>

        <button
          type="button"
          className="export-csv-button"
          onClick={handleExportCSV}
        >
          Export Timeline CSV
        </button>

        {copyMessage && (
          <span className="copy-event-message" role="status">
            {copyMessage}
          </span>
        )}

        {exportMessage && (
          <span className="copy-event-message" role="status">
            {exportMessage}
          </span>
        )}
      </div>

      <div className="timeline-search">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setExportMessage("");
          }}
          placeholder="Search events, time, state, or severity..."
          aria-label="Search shipment events"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setExportMessage("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="timeline-filters">
        <button
          type="button"
          className={filter === "ALL" ? "active" : ""}
          onClick={() => handleFilterChange("ALL")}
        >
          All
        </button>

        <button
          type="button"
          className={filter === "CONTAINER_CREATED" ? "active" : ""}
          onClick={() => handleFilterChange("CONTAINER_CREATED")}
        >
          Created
        </button>

        <button
          type="button"
          className={filter === "LOADED_ON_SHIP" ? "active" : ""}
          onClick={() => handleFilterChange("LOADED_ON_SHIP")}
        >
          Loaded
        </button>

        <button
          type="button"
          className={filter === "TEMPERATURE_SPIKE" ? "active" : ""}
          onClick={() => handleFilterChange("TEMPERATURE_SPIKE")}
        >
          Temperature
        </button>

        <button
          type="button"
          className={filter === "ARRIVED_AT_PORT" ? "active" : ""}
          onClick={() => handleFilterChange("ARRIVED_AT_PORT")}
        >
          Arrival
        </button>
      </div>

      <div className="timeline-sort">
        <label htmlFor="timeline-sort-select">Sort events:</label>

        <select
          id="timeline-sort-select"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="TIME">Time (earliest first)</option>
          <option value="SEVERITY">Severity (highest first)</option>
        </select>
      </div>

      <div className="timeline-list">
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => {
            const eventIndex = shipmentEvents.findIndex(
              (item) => item.id === event.id
            );

            return (
              <button
                type="button"
                className={`timeline-item ${
                  selectedEvent?.id === event.id ? "selected" : ""
                }`}
                key={event.id}
                onClick={() => {
                  onSelectEvent(event);
                  setCopyMessage("");
                }}
              >
                <div className="timeline-marker"></div>

                <div className="timeline-content">
                  <div className="timeline-time">{event.time}</div>

                  <div className="event-title">
                    <h4>{event.type}</h4>

                    <span
                      className={`event-severity ${getEventSeverity(
                        event.type
                      ).toLowerCase()}`}
                    >
                      {getEventSeverity(event.type)}
                    </span>
                  </div>

                  <p>{event.description}</p>

                  <div className="event-state">
                    <span>State</span>
                    <strong>{event.state}</strong>
                  </div>

                  <span className="event-duration">
                    {getEventDuration(eventIndex)} since previous event
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="timeline-empty">
            <strong>No events found</strong>
            <p>
              No shipment events match your search and selected filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { shipmentEvents };
export default ShipmentTimeline;
