import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function PageHeader({ title, subtitle, backTo, actions }) {
  const txtBack = useAutoTranslate('Anterior', 'pt');
  const navigate = useNavigate();

  return (
    <div className="mb-4 animate-slide-in-down">
      {backTo && (
        <Button
          variant="outline"
          size="sm"
          className="mb-2 smooth-transition hover-lift"
          onClick={() => navigate(createPageUrl(backTo))}
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          {txtBack}
        </Button>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1 gradient-text">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-600 animate-fade-in">{subtitle}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex gap-2 animate-scale-in">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}