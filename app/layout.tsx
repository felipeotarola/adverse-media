import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Shield, History, Home } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "KYC Threat Intelligence",
  description: "Advanced threat intelligence and adverse media search for KYC compliance",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="min-h-screen bg-background subtle-grid">
            <header className="border-b border-border/80 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
              <div className="container mx-auto py-3 px-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-xl font-semibold flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-primary" />
                    <a href="/" className="flex items-center">
                      <span>KYC Threat Intelligence</span>
                    </a>
                  </h1>
                  <nav>
                    <ul className="flex space-x-6">
                      <li>
                        <a href="/" className="text-foreground/80 hover:text-primary flex items-center">
                          <Home className="h-4 w-4 mr-1" />
                          <span>Home</span>
                        </a>
                      </li>
                      <li>
                        <a href="/history" className="text-foreground/80 hover:text-primary flex items-center">
                          <History className="h-4 w-4 mr-1" />
                          <span>History</span>
                        </a>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </header>
            <main className="container mx-auto py-6 px-4">{children}</main>
            <footer className="border-t border-border/80 py-4 mt-8">
              <div className="container mx-auto px-4 text-center text-xs text-foreground/60">
                <p>KYC Threat Intelligence System • Secure Search Engine • v1.0.3</p>
                <p className="mt-1">© {new Date().getFullYear()} AdvertMedia • All searches are encrypted and logged</p>
              </div>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
