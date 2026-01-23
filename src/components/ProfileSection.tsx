import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileSection(
  { title, children }: { title: string; children: ReactNode },
) {
  return (
    <Card className="mb-6 last:mb-0">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm text-gray-700 uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
