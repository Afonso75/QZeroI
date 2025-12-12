import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function AdminActivatePage() {
  // Traduções
  const txtActivateManually = useAutoTranslate('Ativar Subscrição Manualmente', 'pt');
  const txtUserEmail = useAutoTranslate('Email do utilizador', 'pt');
  const txtActivating = useAutoTranslate('A ativar...', 'pt');
  const txtActivateSubscription = useAutoTranslate('Ativar Subscrição', 'pt');

  const [email, setEmail] = useState("sofialopesdecoutinho@gmail.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleActivate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('forceActivateSubscription', { email });
      setResult({ success: true, data: response.data });
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{txtActivateManually}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={txtUserEmail}
          />
          <Button
            onClick={handleActivate}
            disabled={loading}
            className="w-full"
          >
            {loading ? txtActivating : txtActivateSubscription}
          </Button>
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}