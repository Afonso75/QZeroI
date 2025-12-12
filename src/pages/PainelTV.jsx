import { useEffect, useState } from 'react';
import './PainelTV.css';
import { TranslatedText } from '@/components/translation/TranslatedText';
import { safeFetch } from '@/utils/apiConfig';

export default function PainelTV() {
  const [senhas, setSenhas] = useState([]);

  const buscarSenhas = async () => {
    try {
      const { response, data } = await safeFetch('/api/demo/tickets?status=aguardando,chamado');
      if (!response.ok || !data) return;
      
      const senhasOrdenadas = data
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        .slice(0, 12)
        .map((senha, index) => ({
          ...senha,
          displayNumber: senha.ticket_number || (index + 1)
        }));
      
      setSenhas(senhasOrdenadas);
    } catch (error) {
      console.error('Erro ao buscar senhas:', error);
    }
  };

  useEffect(() => {
    buscarSenhas();
    
    const intervalo = setInterval(() => {
      buscarSenhas();
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="painel-tv">
      <h1 className="painel-tv-titulo">
        <TranslatedText text="Senhas na Fila" sourceLang="pt" />
      </h1>
      
      {senhas.length === 0 ? (
        <p className="painel-tv-vazio">
          <TranslatedText text="Nenhuma senha na fila." sourceLang="pt" />
        </p>
      ) : (
        <div className="painel-tv-lista">
          {senhas.map((senha) => (
            <div 
              key={senha.id} 
              className={`painel-tv-senha ${senha.status === 'chamado' ? 'painel-tv-senha-chamado' : ''}`}
            >
              <span className="painel-tv-numero">{senha.displayNumber}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
