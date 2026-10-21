import "./style.css";
export const metadata = {
  title: "Pragyan — Ideas, made visible",
  description: "An editable studio for multilingual animated explanations.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
