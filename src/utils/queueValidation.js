function parseTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return null;
  const parts = timeString.split(':');
  if (parts.length !== 2) return null;
  const hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  return hour * 60 + min;
}

export function validateQueueOperating(queue, now = new Date()) {
  if (!queue) {
    return {
      isOperating: false,
      reason: 'Fila não encontrada'
    };
  }

  if (queue.status !== 'aberta') {
    return {
      isOperating: false,
      reason: queue.status === 'pausada' 
        ? 'Fila pausada temporariamente' 
        : 'Fila fechada'
    };
  }

  if (!queue.working_hours || Object.keys(queue.working_hours).length === 0) {
    return {
      isOperating: false,
      reason: 'Horário de funcionamento não configurado'
    };
  }

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = daysOfWeek[now.getDay()];
  const todaySchedule = queue.working_hours[currentDay];

  if (!todaySchedule || !todaySchedule.enabled) {
    return {
      isOperating: false,
      reason: 'Fila fechada hoje'
    };
  }

  if (!todaySchedule.start || !todaySchedule.end) {
    return {
      isOperating: false,
      reason: 'Horário não configurado para hoje'
    };
  }

  const startTime = parseTime(todaySchedule.start);
  let endTime = parseTime(todaySchedule.end);

  if (startTime === null || endTime === null) {
    return {
      isOperating: false,
      reason: 'Horário configurado de forma incorreta'
    };
  }

  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const crossesMidnight = endTime <= startTime;

  if (crossesMidnight) {
    if (endTime === 0) {
      if (currentTime < startTime) {
        return {
          isOperating: false,
          reason: `Fila abre às ${todaySchedule.start}`
        };
      }
    } else {
      if (currentTime < startTime && currentTime >= endTime) {
        return {
          isOperating: false,
          reason: `Fila fechou às ${todaySchedule.end}`
        };
      }
    }
  } else {
    if (currentTime < startTime) {
      return {
        isOperating: false,
        reason: `Fila abre às ${todaySchedule.start}`
      };
    }

    if (currentTime >= endTime) {
      return {
        isOperating: false,
        reason: `Fila fechou às ${todaySchedule.end}`
      };
    }
  }

  const hasBreakStart = todaySchedule.break_start && todaySchedule.break_start.trim() !== '';
  const hasBreakEnd = todaySchedule.break_end && todaySchedule.break_end.trim() !== '';
  
  if (hasBreakStart && hasBreakEnd) {
    const breakStartTime = parseTime(todaySchedule.break_start);
    const breakEndTime = parseTime(todaySchedule.break_end);

    if (breakStartTime === null || breakEndTime === null) {
      return {
        isOperating: false,
        reason: 'Pausa configurada de forma incorreta'
      };
    }

    if (breakEndTime <= breakStartTime) {
      return {
        isOperating: false,
        reason: 'Pausa configurada de forma incorreta'
      };
    }

    if (breakStartTime < startTime || breakEndTime > endTime) {
      return {
        isOperating: false,
        reason: 'Pausa fora do horário de funcionamento'
      };
    }

    if (currentTime >= breakStartTime && currentTime < breakEndTime) {
      return {
        isOperating: false,
        reason: `Fila em pausa até ${todaySchedule.break_end}`
      };
    }
  }

  return {
    isOperating: true,
    reason: null
  };
}
