import { redirect } from 'next/navigation'

/**
 * Client signup is consolidated into /login (the redesigned page handles
 * "Log in or sign up" via the email → create-account step). This route is
 * kept as a permanent redirect so existing inbound links don't 404.
 * Artist signup remains separate at /register/provider.
 */
export default function RegisterPage() {
  redirect('/login')
}
