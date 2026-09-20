import Link from "next/link";
import { Card } from "@/components/ui/card";

export function AdminStub({ title, phase, description, links = [] as Array<{ href: string; label: string }> }: { title: string; phase: string; description: string; links?: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-surface-500 mb-6">Scheduled for {phase}. The data model and APIs already exist; the full console ships in that phase.</p>
      <Card>
        <p className="text-surface-600 text-sm mb-4">{description}</p>
        {links.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-blue-600 hover:underline">{l.label} →</Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
