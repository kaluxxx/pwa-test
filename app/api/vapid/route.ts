import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function GET() {
  try {
    const vapidKeys = webpush.generateVAPIDKeys();
    
    return NextResponse.json({
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
      message: 'Clés VAPID générées. Ajoutez la clé privée dans vos variables d\'environnement.'
    });
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la génération des clés VAPID' },
      { status: 500 }
    );
  }
}