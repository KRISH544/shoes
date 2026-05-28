import { NotificationChannel, NotificationStatus, Release } from "@prisma/client";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import webpush from "web-push";
import { prisma } from "@/lib/db";

type AlertUser = {
  id: string;
  email: string | null;
  phone: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
};

type AlertResult = {
  channel: NotificationChannel;
  status: NotificationStatus;
  error?: string;
};

export async function sendReleaseAlerts(user: AlertUser, release: Release, matchedKeywords: string[]) {
  const channels = getEnabledChannels(user);
  const results: AlertResult[] = [];

  for (const channel of channels) {
    const existing = await prisma.notification.findUnique({
      where: {
        userId_releaseId_channel: {
          userId: user.id,
          releaseId: release.id,
          channel
        }
      }
    });

    if (existing?.status === NotificationStatus.SENT) {
      results.push({ channel, status: NotificationStatus.SKIPPED, error: "Already sent" });
      continue;
    }

    const result = await dispatchChannel(user, release, matchedKeywords, channel);

    await prisma.notification.upsert({
      where: {
        userId_releaseId_channel: {
          userId: user.id,
          releaseId: release.id,
          channel
        }
      },
      update: {
        status: result.status,
        error: result.error,
        sentAt: result.status === NotificationStatus.SENT ? new Date() : null
      },
      create: {
        userId: user.id,
        releaseId: release.id,
        channel,
        status: result.status,
        error: result.error,
        sentAt: result.status === NotificationStatus.SENT ? new Date() : null
      }
    });

    results.push(result);
  }

  return results;
}

function getEnabledChannels(user: AlertUser) {
  const channels: NotificationChannel[] = [];
  if (user.emailEnabled) channels.push(NotificationChannel.EMAIL);
  if (user.smsEnabled) channels.push(NotificationChannel.SMS);
  if (user.pushEnabled) channels.push(NotificationChannel.PUSH);
  return channels;
}

async function dispatchChannel(
  user: AlertUser,
  release: Release,
  matchedKeywords: string[],
  channel: NotificationChannel
): Promise<AlertResult> {
  try {
    if (channel === NotificationChannel.EMAIL) {
      await sendEmailAlert(user, release, matchedKeywords);
    }
    if (channel === NotificationChannel.SMS) {
      await sendSmsAlert(user, release, matchedKeywords);
    }
    if (channel === NotificationChannel.PUSH) {
      await sendPushAlert(user, release, matchedKeywords);
    }

    return { channel, status: NotificationStatus.SENT };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown notification error";
    const isMissingCredentials = message.startsWith("Missing ");
    return {
      channel,
      status: isMissingCredentials ? NotificationStatus.SKIPPED : NotificationStatus.FAILED,
      error: message
    };
  }
}

async function sendEmailAlert(user: AlertUser, release: Release, matchedKeywords: string[]) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;

  if (!apiKey) throw new Error("Missing SENDGRID_API_KEY");
  if (!from) throw new Error("Missing ALERT_FROM_EMAIL");
  if (!user.email) throw new Error("Missing user email");

  sgMail.setApiKey(apiKey);

  const url = release.raffleUrl || release.productUrl || release.sourceUrl;
  const subject = `Sneaker alert: ${release.title}`;
  const text = formatAlertText(release, matchedKeywords);

  await sgMail.send({
    to: user.email,
    from,
    subject,
    text: `${text}\n\nOpen: ${url}`,
    html: `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p><p><a href="${url}">Open release page</a></p>`
  });
}

async function sendSmsAlert(user: AlertUser, release: Release, matchedKeywords: string[]) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid) throw new Error("Missing TWILIO_ACCOUNT_SID");
  if (!token) throw new Error("Missing TWILIO_AUTH_TOKEN");
  if (!from) throw new Error("Missing TWILIO_FROM_NUMBER");
  if (!user.phone) throw new Error("Missing user phone");

  const client = twilio(sid, token);
  const url = release.raffleUrl || release.productUrl || release.sourceUrl;

  await client.messages.create({
    to: user.phone,
    from,
    body: `${formatAlertText(release, matchedKeywords)}\n${url}`.slice(0, 1500)
  });
}

async function sendPushAlert(user: AlertUser, release: Release, matchedKeywords: string[]) {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey) throw new Error("Missing VAPID_PUBLIC_KEY");
  if (!privateKey) throw new Error("Missing VAPID_PRIVATE_KEY");
  if (!subject) throw new Error("Missing VAPID_SUBJECT");

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: user.id }
  });

  if (!subscriptions.length) throw new Error("Missing push subscription");

  const payload = JSON.stringify({
    title: `Sneaker alert: ${release.title}`,
    body: formatAlertText(release, matchedKeywords),
    url: release.raffleUrl || release.productUrl || release.sourceUrl
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          payload
        );
      } catch (error: unknown) {
        if (isExpiredPushSubscription(error)) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        } else {
          throw error;
        }
      }
    })
  );
}

function isExpiredPushSubscription(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

function formatAlertText(release: Release, matchedKeywords: string[]) {
  const lines = [
    release.title,
    `Matched: ${matchedKeywords.join(", ")}`,
    release.retailer ? `Retailer: ${release.retailer}` : null,
    release.price ? `Price: ${release.price}` : null,
    release.releaseDate ? `Release: ${release.releaseDate.toLocaleString()}` : "Release: date not listed yet"
  ];

  return lines.filter(Boolean).join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
