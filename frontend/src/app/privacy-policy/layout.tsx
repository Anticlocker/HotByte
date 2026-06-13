import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HotByte Privacy Policy",
  description:
    "Learn how HotByte collects, uses, and protects your personal information. Your privacy matters to us.",
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
