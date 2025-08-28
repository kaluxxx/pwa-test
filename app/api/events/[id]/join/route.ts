import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { eventsStore } from '@/app/lib/events-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { participantName } = body;

    if (!participantName) {
      return NextResponse.json(
        { error: 'Nom du participant requis' },
        { status: 400 }
      );
    }

    const event = eventsStore.getById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      );
    }

    if (event.participants.includes(participantName)) {
      return NextResponse.json(
        { error: 'Participant déjà inscrit' },
        { status: 400 }
      );
    }

    const updatedEvent = eventsStore.addParticipant(id, participantName);
    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du participant' },
        { status: 500 }
      );
    }

    if (event.organizerSubscription) {
      try {
        webpush.setVapidDetails(
          'mailto:test@example.com',
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
          process.env.VAPID_PRIVATE_KEY || ''
        );

        const payload = JSON.stringify({
          title: `Nouveau participant à "${event.title}"`,
          body: `${participantName} a rejoint votre événement !`,
          eventId: event.id
        });

        await webpush.sendNotification(event.organizerSubscription as unknown as webpush.PushSubscription, payload);
      } catch (error) {
        console.error('Erreur envoi notification:', error);
      }
    }

    return NextResponse.json({ 
      message: 'Participant ajouté avec succès',
      event 
    });
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du participant' },
      { status: 500 }
    );
  }
}