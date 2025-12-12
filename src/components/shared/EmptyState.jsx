import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="py-16 text-center">
        {Icon && <Icon className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        {description && <p className="text-slate-600 mb-6">{description}</p>}
        {action && (
          <Button onClick={action.onClick} variant={action.variant || "default"}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}