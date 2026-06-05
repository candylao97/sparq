import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/server/validation/auth.schema";
import { requestPasswordReset } from "@/server/services/auth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    await requestPasswordReset(email);

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  }
}
