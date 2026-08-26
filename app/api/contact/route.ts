import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 180;
const MAX_MESSAGE_LENGTH = 5000;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = rateLimit(request, "contact", 5, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nieprawidłowe dane formularza." }, { status: 400 });
  }

  // Hidden honeypot field. Bots usually populate it; real visitors never see it.
  if (clean(body.website, 200)) return NextResponse.json({ ok: true });

  const name = clean(body.name, MAX_NAME_LENGTH);
  const email = clean(body.email, MAX_EMAIL_LENGTH).toLowerCase();
  const subject = clean(body.subject, MAX_SUBJECT_LENGTH);
  const message = clean(body.message, MAX_MESSAGE_LENGTH);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Imię, e-mail i wiadomość są wymagane." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
  }

  await prisma.contactMessage.create({
    data: { name, email, subject: subject || null, message },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
