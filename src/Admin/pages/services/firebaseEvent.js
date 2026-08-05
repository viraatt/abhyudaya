/**
 * Backward compatibility proxy service for Admin panel.
 * Imports all methods directly from primary EventService foundation.
 */

export {
  uploadEventImage,
  getEvents,
  getEventBySlug,
  getEventById,
  createEvent,
  addEvent,
  updateEvent,
  deleteEvent,
} from "../../../Firebase/eventService";
