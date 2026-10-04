// Datas do app ("hoje", sequência, horário do lembrete) seguem o fuso da família, não o do servidor
// (em Docker o servidor costuma estar em UTC). Importado antes de qualquer outro módulo.
process.env.TZ = process.env.APP_TZ || process.env.TZ || "America/Sao_Paulo";

export {};
