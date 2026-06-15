import NextAuth from 'next-auth'
import { authConfig } from './lib/auth.config'

export default NextAuth(authConfig).auth

export const config = {
  // Protect all routes except auth APIs, static assets, and favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
