import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from './contexts/UserContext'

export const metadata: Metadata = {
  title: 'Trivia Content Repository',
  description: 'A collaborative repository for trivia content creators',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}

