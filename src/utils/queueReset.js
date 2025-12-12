import { base44 } from "@/api/base44Client";

/**
 * Verifica se a fila precisa ser resetada para um novo dia
 * e reseta os contadores se necessário
 * @param {Object} queue - A fila para verificar
 * @returns {Object} - A fila atualizada (ou original se não precisar reset)
 */
export async function checkAndResetQueueForNewDay(queue) {
  if (!queue) return queue;

  const today = new Date().toISOString().split('T')[0]; // Formato: YYYY-MM-DD
  const lastResetDate = queue.last_reset_date;

  // Se já foi resetada hoje, não fazer nada
  if (lastResetDate === today) {
    return queue;
  }

  // Resetar contadores para começar do zero num novo dia
  console.log(`🔄 Novo dia detectado! Resetando fila "${queue.name}" (última reset: ${lastResetDate || 'nunca'})`);
  
  try {
    const updatedQueue = await base44.entities.Queue.update(queue.id, {
      current_number: 0,
      last_issued_number: 0,
      last_reset_date: today
    });

    console.log(`✅ Fila "${queue.name}" resetada - senhas começam do #1`);
    return updatedQueue;
  } catch (err) {
    // Se o utilizador não tem permissão para atualizar a fila (conta pessoal),
    // retornar a fila com contadores zerados localmente para permitir tirar senha
    console.warn('⚠️ Sem permissão para resetar fila (conta pessoal), usando valores zerados localmente:', err.message);
    return {
      ...queue,
      current_number: 0,
      last_issued_number: 0,
      last_reset_date: today
    };
  }
}
