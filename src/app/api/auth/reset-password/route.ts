import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/server/validation/auth.schema";
import { resetPassword } from "@/server/services/auth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    await resetPassword(token, password);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
