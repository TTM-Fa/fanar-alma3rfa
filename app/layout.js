import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Note: metadata is now in a separate file since this is a client component

export default function RootLayout({ children }) {

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        <footer className="m-4 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} StudyBuddy. All rights reserved.
          </p>
          <p>
            Made with <span className="text-red-500">♥️</span> by QCRI Interns
          </p>
        </footer>
      </body>
    </html>
  );
}
