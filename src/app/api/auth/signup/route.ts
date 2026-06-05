import { NextResponse } from "next/server";
import { signupSchema } from "@/server/validation/auth.schema";
import { createUser } from "@/server/services/auth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = signupSchema.parse(body);

    await createUser({
      name: validated.name,
      email: validated.email,
      password: validated.password,
      role: validated.role,
    });

    return NextResponse.json(
      { message: "Account created. Please check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
