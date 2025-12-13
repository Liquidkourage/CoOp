import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}

