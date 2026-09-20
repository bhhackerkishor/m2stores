import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import cloudinary from "@/lib/cloudinary";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) {
      return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "No file provided"), { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Only JPEG, PNG, WebP, and GIF images are allowed"),
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "File size must be under 10MB"),
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `m2stores/${folder}`,
          resource_type: "image",
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (error: any, result: any) => {
          if (error) return reject(error);
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      uploadStream.end(buffer);
    });

    logger.info("Image uploaded", "upload", { publicId: result.public_id, folder });

    return NextResponse.json(
      successResponse({ url: result.secure_url, publicId: result.public_id })
    );
  } catch (error: any) {
    logger.error("Upload error", "upload", { error: String(error?.message || error) });
    return NextResponse.json(
      errorResponse("UPLOAD_FAILED", error?.message || "Failed to upload image"),
      { status: 500 }
    );
  }
}
