'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: string;
  title: string;
  organizer: string;
  participants: string[];
  createdAt: string;
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchEvents();
    checkNotificationPermission();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    }
  };

  const checkNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission;
      setIsNotificationEnabled(permission === 'granted');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      console.log('=== DÉBUT ACTIVATION NOTIFICATIONS ===');
      console.log('Notification support:', 'Notification' in window);
      console.log('ServiceWorker support:', 'serviceWorker' in navigator);
      console.log('PushManager support:', 'PushManager' in window);
      console.log('User agent:', navigator.userAgent);
      console.log('Is secure context:', window.isSecureContext);
      console.log('Protocol:', window.location.protocol);
      console.log('Current permission:', Notification.permission);
      
      if (typeof window === 'undefined') {
        alert('Erreur: window non disponible');
        return;
      }
      
      if (!('Notification' in window)) {
        alert('Les notifications ne sont pas supportées par ce navigateur.');
        return;
      }
      
      if (!('serviceWorker' in navigator)) {
        let errorMsg = 'Les service workers ne sont pas supportés par ce navigateur.\n\n';
        
        // Vérification sécurisée du userAgent
        const userAgent = (typeof window !== 'undefined' && window.navigator) ? window.navigator.userAgent : '';
        
        if (userAgent.includes('Chrome')) {
          errorMsg += 'Solutions pour Chrome Android :\n';
          errorMsg += '• Vérifiez que vous êtes en HTTPS (pas HTTP)\n';
          errorMsg += '• Mettez à jour Chrome vers la dernière version\n';
          errorMsg += '• Désactivez le "Mode données" si activé\n';
          errorMsg += '• Essayez en navigation privée\n';
        } else if (userAgent.includes('Firefox')) {
          errorMsg += 'Sur Firefox Android, les Service Workers peuvent être désactivés.\n';
          errorMsg += 'Allez dans about:config et activez dom.serviceWorkers.enabled';
        } else {
          errorMsg += 'Navigateur: ' + userAgent.substring(0, 100) + '...\n';
          errorMsg += 'Essayez avec Chrome ou Firefox à jour.';
        }
        
        alert(errorMsg);
        return;
      }

      console.log('Vérification du statut actuel des notifications...');
      console.log('Permission actuelle:', Notification.permission);
      
      // Pour Android Chrome, il faut parfois d'abord vérifier si l'app est installée
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      console.log('Mode standalone:', isStandalone);
      
      // Attendre que le service worker soit prêt
      console.log('Attente du service worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker prêt:', registration);
      
      // Vérifier si les notifications push sont supportées
      if (!('PushManager' in window)) {
        alert('Les notifications push ne sont pas supportées par ce navigateur.');
        return;
      }
      
      // Vérification spéciale pour mobile
      if (Notification.permission === 'denied') {
        console.log('Permission déjà refusée');
        alert('❌ Notifications bloquées.\n\nPour les débloquer sur mobile :\n1. Menu Chrome (⋮) → Paramètres\n2. Paramètres du site\n3. Notifications → Autoriser');
        return;
      }
      
      if (Notification.permission === 'granted') {
        console.log('Permission déjà accordée');
        setIsNotificationEnabled(true);
        await subscribeToNotifications();
        alert('✅ Notifications déjà actives !');
        return;
      }
      
      console.log('🔔 Demande de permission...');
      
      // Sur mobile, parfois il faut une interaction utilisateur plus explicite
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        console.log('📱 Appareil mobile détecté');
        
        // Petite pause pour s'assurer que l'interaction utilisateur est bien prise en compte
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const permission = await Notification.requestPermission();
      console.log('📋 Résultat permission:', permission);
      
      if (permission === 'granted') {
        console.log('✅ Permission accordée !');
        setIsNotificationEnabled(true);
        console.log('📡 Inscription aux notifications...');
        await subscribeToNotifications();
        alert('🎉 Notifications activées avec succès !');
      } else if (permission === 'denied') {
        console.log('❌ Permission refusée');
        alert('❌ Permission refusée.\n\nPour activer manuellement :\n📱 Chrome → Menu → Paramètres du site → Notifications → Autoriser');
      } else if (permission === 'default') {
        console.log('⚠️ Aucune réponse utilisateur');
        alert('⚠️ Aucune réponse détectée.\n\nSur certains mobiles :\n1. Appuyez longuement sur l\'icône cadenas 🔒\n2. Autorisez les notifications\n3. Rechargez la page');
      } else {
        console.log('🤷 Statut inattendu:', permission);
        alert('Statut inattendu: ' + permission);
      }
    } catch (error) {
      console.error('Erreur détaillée lors de la demande de permission:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Erreur lors de l\'activation des notifications:\n' + errorMessage + '\n\nSur Android, essayez d\'ajouter le site à votre écran d\'accueil d\'abord.');
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToNotifications = async () => {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI93YjYjw6vn8GYUOF_7l9L8A3bwTyDT_DT7v8aQFqDH_Hql4FKBHnkRCaJ';
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        setSubscription(sub);
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription aux notifications:', error);
    }
  };

  const createEvent = async () => {
    if (!newEventTitle || !organizerName) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEventTitle,
          organizer: organizerName,
          organizerSubscription: subscription
        }),
      });

      if (response.ok) {
        setNewEventTitle('');
        setOrganizerName('');
        fetchEvents();
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
    }
  };

  const joinEvent = async (eventId: string) => {
    if (!participantName.trim()) {
      alert('Veuillez entrer votre nom');
      return;
    }

    try {
      console.log('Tentative de rejoindre l\'événement:', eventId, 'avec le nom:', participantName);
      
      const response = await fetch(`/api/events/${eventId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantName: participantName.trim()
        }),
      });

      console.log('Réponse du serveur:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Succès:', result);
        setParticipantName('');
        await fetchEvents();
        alert('Vous avez rejoint l\'événement !');
      } else {
        const errorData = await response.json();
        console.error('Erreur du serveur:', errorData);
        alert(errorData.error || 'Erreur lors de la participation');
      }
    } catch (error) {
      console.error('Erreur lors de la participation à l\'événement:', error);
      alert('Erreur de connexion. Vérifiez votre connexion internet.');
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">
          🎉 Event Notifications PWA
        </h1>

        {isClient && !isNotificationEnabled && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <p className="mb-2">Activez les notifications pour recevoir des alertes quand quelqu&apos;un rejoint vos événements !</p>
            <p className="text-sm mb-3">📱 Sur Android : Ajoutez d&apos;abord le site à votre écran d&apos;accueil pour de meilleures performances</p>
            
            {'serviceWorker' in navigator ? (
              <div>
                <button 
                  onClick={requestNotificationPermission}
                  className="w-full bg-yellow-500 text-white px-4 py-3 rounded text-lg hover:bg-yellow-600 active:bg-yellow-700 transition-colors"
                  style={{
                    touchAction: 'manipulation',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                  }}
                >
                  🔔 Activer les notifications push
                </button>
                <p className="text-xs mt-2 text-center">📱 Sur mobile : une popup devrait apparaître</p>
                <button
                  onClick={() => {
                    console.log('=== DIAGNOSTIC MOBILE ===');
                    console.log('User Agent:', navigator.userAgent);
                    console.log('Notification support:', 'Notification' in window);
                    console.log('Current permission:', Notification.permission);
                    console.log('Is HTTPS:', location.protocol === 'https:');
                    console.log('Is localhost:', location.hostname === 'localhost');
                    console.log('ServiceWorker support:', 'serviceWorker' in navigator);
                    console.log('PushManager support:', 'PushManager' in window);
                    console.log('Is secure context:', window.isSecureContext);
                    
                    const info = `
🔍 DIAGNOSTIC:
📱 Mobile: ${/Android|iPhone|iPad/i.test(navigator.userAgent)}
🔒 HTTPS: ${location.protocol === 'https:'}
🏠 Localhost: ${location.hostname === 'localhost'}
🔔 Notifications: ${Notification.permission}
⚙️ ServiceWorker: ${'serviceWorker' in navigator}
                    `;
                    alert(info);
                  }}
                  className="w-full mt-2 bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                >
                  🔍 Diagnostic mobile
                </button>
              </div>
            ) : (
              <div>
                <button 
                  onClick={requestNotificationPermission}
                  className="w-full bg-orange-500 text-white px-4 py-3 rounded text-lg hover:bg-orange-600"
                >
                  🔔 Activer les notifications simples
                </button>
                <p className="text-xs mt-2">Service Workers non supportés - notifications locales uniquement</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-100 rounded-lg border border-gray-300 p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-black">Créer un nouvel événement</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nom de l&apos;organisateur"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            />
            <input
              type="text"
              placeholder="Titre de l&apos;événement"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            />
            <button
              onClick={createEvent}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Créer l'événement
            </button>
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg border border-gray-300 p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-black">Rejoindre un événement</h2>
          <input
            type="text"
            placeholder="Votre nom"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4 bg-white text-black text-base"
            onKeyPress={(e) => e.key === 'Enter' && events.length > 0 && events[0] && joinEvent(events[0].id)}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-black">Événements disponibles</h2>
          {events.length === 0 ? (
            <p className="text-center py-8">Aucun événement disponible</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-gray-100 rounded-lg border border-gray-300 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-black">{event.title}</h3>
                    <p>Organisé par: {event.organizer}</p>
                    <p className="text-sm ">
                      Créé le {new Date(event.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => joinEvent(event.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!participantName.trim()}
                  >
                    Rejoindre
                  </button>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-black mb-2">
                    Participants ({event.participants.length})
                  </h4>
                  {event.participants.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {event.participants.map((participant, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                        >
                          {participant}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">Aucun participant pour le moment</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}