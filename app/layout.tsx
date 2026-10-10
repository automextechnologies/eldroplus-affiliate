import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans_Malayalam, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-fraunces",
  display: "swap",
});

const malayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  weight: ["500", "600", "700"],
  variable: "--font-malayalam",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.eldroplus.com"),
  title: "Eldro+ | Join the 30-Day Golden Wellness Challenge",
  description:
    "Gentle, expert-guided 30-day wellness challenge for older adults — live yoga, meditation, expert consultations and daily reminders. Sign up for yourself or your parents.",
  icons: { icon: "https://www.eldroplus.com/assets/eldroplusiconv2.png" },
  openGraph: {
    title: "Eldro+ | 30-Day Golden Wellness Challenge",
    description: "Stay healthy today. Enjoy a better tomorrow. A wellness program made for older adults.",
    url: "https://www.eldroplus.com/",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#24332b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${malayalam.variable}`}>
      <body>{children}</body>
    </html>
  );
}
