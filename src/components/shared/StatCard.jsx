import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StatCard({ icon: Icon, value, label, color, badge, bgGradient }) {
  return (
    <Card className={`border-0 shadow-lg ${bgGradient || 'bg-white'}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {badge && <Badge className={badge.className}>{badge.text}</Badge>}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        <p className="text-slate-600 text-sm">{label}</p>
      </CardContent>
    </Card>
  );
}