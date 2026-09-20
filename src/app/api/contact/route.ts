import { NextResponse } from "next/server";

interface ContactBody {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body: ContactBody = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: { message: "Name is required (min 2 characters)" } },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { success: false, error: { message: "A valid email address is required" } },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== "string" || body.message.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: { message: "Message is required (min 10 characters)" } },
        { status: 400 }
      );
    }

    const contactMessage = {
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim() || null,
      subject: body.subject || "General Inquiry",
      message: body.message.trim(),
      createdAt: new Date().toISOString(),
    };

    console.log("[Contact Form Submission]", JSON.stringify(contactMessage, null, 2));

    // TODO: Persist to database or send email notification
    // Example: await db.collection('contactMessages').insertOne(contactMessage);
    // Example: await sendEmail({ to: 'support@m2stores.com', ... });

    return NextResponse.json({
      success: true,
      data: { message: "Your message has been received. We'll get back to you soon." },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Invalid request body" } },
      { status: 400 }
    );
  }
}
