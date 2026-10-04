import { api } from "./api.ts";

export interface PushStatus {
  publicKey: string;
  devices: number;
  remind_at: string;
  endpoints: string[];
}

export const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhone/iPad só recebem push com o app instalado na tela inicial (iOS 16.4+). */
export const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone =
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error("O app ainda está terminando de instalar. Recarregue a página e tente de novo.");
  return navigator.serviceWorker.ready;
}

/** Inscrição deste aparelho (se houver). */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function enableReminders(publicKey: string, remindAt: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação negada. Libere nas configurações do navegador.");
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  await api("/push/subscribe", { body: { subscription: sub.toJSON(), remind_at: remindAt } });
}

export async function disableReminders() {
  const sub = await currentSubscription();
  if (!sub) return;
  await api("/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}
