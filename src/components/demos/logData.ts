import { mulberry32 } from "@/lib/rng";

export type LogEvent = {
  t: number;
  ap: string;
  band: string;
  device: string;
  mac: string;
  event: string;
  reason?: string;
  raw: string;
  line: number;
};

export const DAY_START = Date.UTC(2031, 2, 14, 9, 0, 0);
export const WINDOW_S = 3 * 3600;
export const DEVICES = ["tab-01", "tab-02", "tab-03", "tab-04", "tab-05", "tab-06", "lap-01"];
export const APS = ["ap-1", "ap-2", "ap-3"];

function iso(t: number) {
  return new Date(DAY_START + t * 1000).toISOString().replace(".000", "");
}

function macFor(device: string) {
  const n = DEVICES.indexOf(device) + 1;
  return `02:1a:7c:40:00:${n.toString(16).padStart(2, "0")}`;
}

/** Generates a raw access-point log with four planted failure patterns. */
export function generateLog(seed: number): string {
  const r = mulberry32(seed);
  type Raw = { t: number; text: string };
  const rows: Raw[] = [];
  const add = (t: number, ap: string, band: string, device: string, mac: string, event: string, reason?: string) => {
    rows.push({ t, text: `${iso(t)} ${ap} ${band} ${device} ${mac} ${event}${reason ? ` reason=${reason}` : ""}` });
  };
  const connect = (t: number, ap: string, band: string, device: string, mac: string) => {
    add(t, ap, band, device, mac, "PROBE");
    add(t + 1, ap, band, device, mac, "ASSOC");
    add(t + 2, ap, band, device, mac, "AUTH_OK");
    add(t + 3, ap, band, device, mac, "DHCP_ACK");
  };

  for (const device of ["tab-01", "tab-04", "tab-06", "lap-01"]) {
    let t = Math.floor(r() * 600);
    const mac = macFor(device);
    while (t < WINDOW_S - 900) {
      const ap = APS[Math.floor(r() * APS.length)];
      const band = r() < 0.7 ? "5G" : "2.4G";
      connect(t, ap, band, device, mac);
      const dur = 1200 + Math.floor(r() * 2600);
      const end = Math.min(t + dur, WINDOW_S - 60);
      if (!(ap === "ap-2" && end > 9900 && t < 9900)) add(end, ap, band, device, mac, "DISASSOC", "8");
      t = end + 20 + Math.floor(r() * 240);
    }
  }

  // Pattern 1: tab-03 stuck in a fixed-interval reconnect loop.
  {
    const mac = macFor("tab-03");
    connect(120, "ap-1", "5G", "tab-03", mac);
    add(2350, "ap-1", "5G", "tab-03", mac, "DISASSOC", "8");
    let t = 2400;
    for (let i = 0; i < 44; i++) {
      add(t, "ap-3", "5G", "tab-03", mac, "ASSOC");
      add(t + 1, "ap-3", "5G", "tab-03", mac, "AUTH_OK");
      add(t + 2, "ap-3", "5G", "tab-03", mac, "DHCP_ACK");
      add(t + 29 + (r() < 0.5 ? 0 : 1), "ap-3", "5G", "tab-03", mac, "DISASSOC", "4");
      t += 30;
    }
    connect(t + 400, "ap-1", "5G", "tab-03", mac);
    add(t + 3000, "ap-1", "5G", "tab-03", mac, "DISASSOC", "8");
  }

  // Pattern 2: tab-05 rejected while a privacy feature randomizes its hardware address.
  {
    let t = 3600;
    for (let i = 0; i < 11; i++) {
      const rnd = `ae:${Array.from({ length: 5 }, () => Math.floor(r() * 256).toString(16).padStart(2, "0")).join(":")}`;
      add(t, "ap-2", "5G", "tab-05", rnd, "PROBE");
      add(t + 1, "ap-2", "5G", "tab-05", rnd, "ASSOC");
      add(t + 2, "ap-2", "5G", "tab-05", rnd, "AUTH_REJECT", "unknown-mac");
      t += 55 + Math.floor(r() * 30);
    }
    const mac = macFor("tab-05");
    connect(t + 90, "ap-2", "5G", "tab-05", mac);
    add(t + 2600, "ap-2", "5G", "tab-05", mac, "DISASSOC", "8");
  }

  // Pattern 3: tab-02 sessions that always end about four minutes in (screen timeout).
  {
    const mac = macFor("tab-02");
    let t = 6200;
    for (let i = 0; i < 6; i++) {
      const ap = i % 2 ? "ap-1" : "ap-3";
      connect(t, ap, "2.4G", "tab-02", mac);
      add(t + 3 + 240 + Math.floor(r() * 12), ap, "2.4G", "tab-02", mac, "DISASSOC", "4");
      t += 600 + Math.floor(r() * 300);
    }
  }

  // Pattern 4: mass disassociation on ap-2, followed by a reboot.
  {
    const t0 = 9900;
    let k = 0;
    for (const device of ["tab-01", "tab-04", "tab-06", "lap-01"]) {
      connect(t0 - 1800 - k * 200, "ap-2", "5G", device, macFor(device));
      add(t0 + k, "ap-2", "5G", device, macFor(device), "DISASSOC", "1");
      k += 1;
    }
    rows.push({ t: t0 + 6, text: `${iso(t0 + 6)} ap-2 -- system -- REBOOT` });
  }

  rows.sort((a, b) => a.t - b.t);
  return rows.map((x) => x.text).join("\n");
}

const LINE = /^(\S+)\s+(ap-\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([A-Z_]+)(?:\s+reason=(\S+))?$/;

export function parseLog(text: string): { events: LogEvent[]; skipped: number } {
  const events: LogEvent[] = [];
  let skipped = 0;
  text.split(/\r?\n/).forEach((raw, i) => {
    const m = raw.trim().match(LINE);
    if (!m) {
      if (raw.trim()) skipped += 1;
      return;
    }
    const t = (Date.parse(m[1]) - DAY_START) / 1000;
    if (!Number.isFinite(t)) {
      skipped += 1;
      return;
    }
    events.push({ t, ap: m[2], band: m[3], device: m[4], mac: m[5], event: m[6], reason: m[7], raw, line: i + 1 });
  });
  return { events, skipped };
}

export type Session = { device: string; ap: string; band: string; start: number; end: number; reason?: string };

export function sessions(events: LogEvent[]): Session[] {
  const open = new Map<string, Session>();
  const out: Session[] = [];
  for (const e of events) {
    if (e.device === "system") continue;
    if (e.event === "ASSOC") open.set(e.device, { device: e.device, ap: e.ap, band: e.band, start: e.t, end: WINDOW_S });
    if (e.event === "AUTH_REJECT") open.delete(e.device);
    if (e.event === "DISASSOC") {
      const s = open.get(e.device);
      if (s) {
        s.end = e.t;
        s.reason = e.reason;
        out.push(s);
        open.delete(e.device);
      }
    }
  }
  open.forEach((s) => out.push(s));
  return out;
}

export type Finding = { id: string; title: string; detail: string; devices: string[]; from: number; to: number };

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

export function detect(events: LogEvent[]): Finding[] {
  const out: Finding[] = [];
  const byDevice = new Map<string, LogEvent[]>();
  for (const e of events) byDevice.set(e.device, [...(byDevice.get(e.device) ?? []), e]);

  for (const [device, evs] of byDevice) {
    const drops = evs.filter((e) => e.event === "DISASSOC").map((e) => e.t);
    const gaps = drops.slice(1).map((t, i) => t - drops[i]);
    let best = { start: 0, len: 0, interval: 0 };
    for (let i = 0; i < gaps.length; i++) {
      let j = i;
      const base = gaps[i];
      while (j < gaps.length && Math.abs(gaps[j] - base) <= Math.max(2, base * 0.12)) j++;
      if (j - i > best.len) best = { start: i, len: j - i, interval: median(gaps.slice(i, j)) };
    }
    if (best.len >= 6 && best.interval < 300) {
      out.push({
        id: `loop-${device}`,
        title: `${device}: reconnect loop every ${best.interval} s`,
        detail: `${best.len + 1} disconnects at a near-constant interval over ${Math.round((drops[best.start + best.len] - drops[best.start]) / 60)} minutes. A fixed rhythm like this points at a timer or configuration, not random interference.`,
        devices: [device],
        from: drops[best.start] - 30,
        to: drops[best.start + best.len] + 30,
      });
    }

    const rejects = evs.filter((e) => e.event === "AUTH_REJECT");
    if (rejects.length >= 3) {
      const macs = new Set(rejects.map((e) => e.mac));
      out.push({
        id: `reject-${device}`,
        title: `${device}: ${rejects.length} authentication rejects, ${macs.size} different hardware addresses`,
        detail: `Every attempt reaches the last step and is refused as an unknown device. The hardware address changes each time, which is what a randomized "private address" setting does. The server only knows the real one.`,
        devices: [device],
        from: rejects[0].t - 60,
        to: rejects[rejects.length - 1].t + 60,
      });
    }

    const sess = sessions(evs).filter((s) => s.reason === "4" && s.end - s.start > 120);
    const durations = sess.map((s) => s.end - s.start);
    const med = median(durations);
    const similar = sess.filter((s) => Math.abs(s.end - s.start - med) <= med * 0.08);
    if (similar.length >= 4 && med > 120) {
      out.push({
        id: `idle-${device}`,
        title: `${device}: sessions keep ending after about ${Math.round(med / 60)} minutes`,
        detail: `${similar.length} sessions end with an inactivity disconnect at nearly the same length. Worth testing against the device's screen timeout and its configuration profile.`,
        devices: [device],
        from: similar[0].start - 60,
        to: similar[similar.length - 1].end + 60,
      });
    }
  }

  const disassoc = events.filter((e) => e.event === "DISASSOC").sort((a, b) => a.t - b.t);
  for (let i = 0; i < disassoc.length; i++) {
    const windowEvents = disassoc.filter((e) => e.ap === disassoc[i].ap && e.t >= disassoc[i].t && e.t <= disassoc[i].t + 10);
    const devices = new Set(windowEvents.map((e) => e.device));
    if (devices.size >= 4) {
      const reboot = events.find((e) => e.event === "REBOOT" && e.ap === disassoc[i].ap && Math.abs(e.t - disassoc[i].t) < 60);
      out.push({
        id: `mass-${disassoc[i].ap}-${disassoc[i].t}`,
        title: `${disassoc[i].ap}: ${devices.size} devices dropped within 10 seconds`,
        detail: `A mass disassociation${reboot ? ", followed by an access-point reboot" : ""}. That's the access point, not the devices. Next step: reproduce with a controlled set of clients to find the trigger.`,
        devices: Array.from(devices),
        from: disassoc[i].t - 120,
        to: disassoc[i].t + 120,
      });
      break;
    }
  }
  return out;
}

export function clock(t: number) {
  const d = new Date(DAY_START + t * 1000);
  return d.toISOString().slice(11, 16);
}
