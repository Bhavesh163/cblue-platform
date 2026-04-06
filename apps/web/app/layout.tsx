import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CBLUE - Find Fixers | แพลตฟอร์มช่างซ่อมบำรุงอันดับ 1",
  description:
    "CBLUE เชื่อมต่อคุณกับช่างมืออาชีพทั่วประเทศไทย บริการซ่อมบ้าน ไฟฟ้า ประปา แอร์ และอื่น ๆ",
  icons: {
    icon: "/images/favicon-c.png",
    apple: "/images/favicon-c.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
