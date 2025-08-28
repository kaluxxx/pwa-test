export interface Event {
  id: string;
  title: string;
  organizer: string;
  organizerSubscription?: PushSubscription;
  participants: string[];
  createdAt: string;
}

class EventsStore {
  private events: Event[] = [];

  getAll(): Event[] {
    return [...this.events];
  }

  getById(id: string): Event | undefined {
    return this.events.find(event => event.id === id);
  }

  create(event: Event): Event {
    this.events.push(event);
    return event;
  }

  addParticipant(eventId: string, participantName: string): Event | null {
    const event = this.events.find(e => e.id === eventId);
    if (event && !event.participants.includes(participantName)) {
      event.participants.push(participantName);
      return event;
    }
    return null;
  }
}

export const eventsStore = new EventsStore();