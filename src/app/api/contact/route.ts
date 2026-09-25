import { contactFormSchema } from "@/validators/route-guards";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";


export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = contactFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.errors[0]?.message || "Invalid submission" } },
        { status: 400 }
      );
    }
    const { name, email, phone, subject, message } = parsed.data;

    const contactMessage = {
      name,
      email,
      phone: phone || null,
      subject: subject || "General Inquiry",
      message,
      createdAt: new Date().toISOString(),
    };

    logger.info("Contact form submission", "contact", contactMessage);

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
