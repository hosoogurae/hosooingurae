import { AdminTabs } from "../AdminTabs";

const TABS = [
  { label: "상담 도우미", href: "/admin/tools/consult-helper" },
  { label: "광고용 도구", href: "/admin/tools/ad-copy" },
  { label: "지역 소식", href: "/admin/tools/notices" },
];

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={TABS} />
      {children}
    </div>
  );
}
