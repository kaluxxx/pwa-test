'use server'

import webpush from 'web-push'
import { prisma } from '../lib/prisma'

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function subscribeUser(sub: PushSubscription) {
  const p256dh = sub.getKey('p256dh') ? Buffer.from(sub.getKey('p256dh')!).toString('base64') : ''
  const auth = sub.getKey('auth') ? Buffer.from(sub.getKey('auth')!).toString('base64') : ''
  
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { p256dh, auth },
    create: {
      endpoint: sub.endpoint,
      p256dh,
      auth,
    },
  })
  
  return { success: true }
}

export async function unsubscribeUser(endpoint: string) {
  await prisma.pushSubscription.delete({
    where: { endpoint },
  })
  return { success: true }
}

export async function sendNotification(message: string) {
  const subscriptions = await prisma.pushSubscription.findMany()
  
  if (subscriptions.length === 0) {
    throw new Error('No subscriptions available')
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: 'Notification Test',
            body: message,
            icon: '/icon.png',
          })
        )
      } catch (error) {
        console.error('Error sending to subscription:', error)
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          })
        }
        throw error
      }
    })
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  return { success: true, sent: successful, total: subscriptions.length }
}