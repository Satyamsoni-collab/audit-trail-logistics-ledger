
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function fetchShipmentEvents(shipmentId, options = {}) {
  const id = String(shipmentId || "").trim();

  if (!id) {
    throw new Error("Please enter a shipment ID.");
  }

  const url = `${API_BASE_URL}/api/queries/inventory/${encodeURIComponent(id)}/events`;

  let response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: options.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Cannot connect to the Audit Trail API. Check that the backend is running."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Unable to fetch shipment events (HTTP ${response.status}).`
    );
  }

  const data = await response.json();

  if (!data || !Array.isArray(data.events)) {
    throw new Error("Invalid event history response from the API.");
  }

  const events = [...data.events]
    .sort((a, b) => Number(a.version) - Number(b.version))
    .map((event) => ({
      id: event._id || `${id}-${event.version}`,
      type: event.eventType,
      version: event.version,
      timestamp: event.timestamp,
      time: event.timestamp
        ? new Date(event.timestamp).toLocaleTimeString()
        : "Unknown",
      payload: event.payload || {},
      actor: event.actor || "Unknown",
      state: event.eventType,
    }));

  return {
    aggregateId: data.aggregateId || id,
    totalEvents: events.length,
    events,
  };
}
