import { AdminTabs } from "../AdminTabs";

const TABS = [
  { label: "문자 쓰기", href: "/admin/sms/compose" },
  { label: "양식 관리", href: "/admin/sms/templates" },
  { label: "계약 준비물", href: "/admin/sms/contract-prep" },
];

export default function SmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={TABS} />
      {children}
    </div>
  );
}
