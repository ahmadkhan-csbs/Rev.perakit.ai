export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ margin: 0, background: "#070b08", color: "#e9f2ea", fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
