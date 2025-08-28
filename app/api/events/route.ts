import { NextRequest, NextResponse } from 'next/server';
import {eventsStore, Event} from "@/app/lib/events-store";

export async function GET() {
  return NextResponse.json(eventsStore.getAll());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, organizer, organizerSubscription } = body;

    if (!title || !organizer) {
      return NextResponse.json(
        { error: 'Title et organizer sont requis' },
        { status: 400 }
      );
    }

    const newEvent: Event = {
      id: Date.now().toString(),
      title,
      organizer,
      organizerSubscription,
      participants: [],
      createdAt: new Date().toISOString()
    };

    eventsStore.create(newEvent);
    
    return NextResponse.json(newEvent, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    );
  }
}