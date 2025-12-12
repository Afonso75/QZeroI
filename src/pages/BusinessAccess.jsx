import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUploadUrl } from "@/utils/apiConfig";
import { 
  Building2,
  MapPin,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function BusinessAccessPage() {
  // Traduções
  const txtSelectCompany = useAutoTranslate('Selecione a Sua Empresa', 'pt');
  const txtChooseCompany = useAutoTranslate('Escolha a empresa que deseja gerir para aceder ao painel empresarial', 'pt');
  const txtNoCompanies = useAutoTranslate('Nenhuma Empresa Disponível', 'pt');
  const txtContactAdmin = useAutoTranslate('Contacte o administrador para criar uma empresa', 'pt');
  const txtProcessing = useAutoTranslate('A processar...', 'pt');
  const txtAccessAsManager = useAutoTranslate('Aceder como Gestor', 'pt');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.filter({ is_active: true }),
    initialData: [],
  });

  const selectBusinessMutation = useMutation({
    mutationFn: async (businessId) => {
      await base44.auth.updateMe({
        business_id: businessId,
        is_business_user: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate(createPageUrl("BusinessDashboard"));
    },
  });

  if (!user || isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-96 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {txtSelectCompany}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {txtChooseCompany}
          </p>
        </div>

        {businesses.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {txtNoCompanies}
              </h3>
              <p className="text-slate-600 mb-6">
                {txtContactAdmin}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map(business => (
              <Card key={business.id} className="border-0 shadow-lg hover:shadow-2xl transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    {business.logo_url ? (
                      <img 
                        src={getUploadUrl(business.logo_url)} 
                        alt={business.name}
                        className="w-14 h-14 rounded-xl object-contain bg-slate-50 p-2"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">
                          {business.name[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{business.name}</CardTitle>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                        {business.category}
                      </Badge>
                    </div>
                  </div>
                  
                  {business.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {business.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent>
                  {business.address && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{business.address}</span>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    onClick={() => selectBusinessMutation.mutate(business.id)}
                    disabled={selectBusinessMutation.isPending}
                  >
                    {selectBusinessMutation.isPending ? (
                      txtProcessing
                    ) : (
                      <>
                        {txtAccessAsManager}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}