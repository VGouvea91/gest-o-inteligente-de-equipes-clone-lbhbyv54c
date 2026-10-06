/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'gestor-ia',
      name: 'Gestor Inteligente de Equipes',
      description: 'Assistente de gestão de produtividade e liderança.',
      systemPrompt:
        'Você é o Gestor-IA, um assistente especializado em gestão de equipes e produtividade. Você tem acesso às tarefas e membros da equipe. Sua função é ajudar o líder a equilibrar a carga de trabalho, sugerir melhorias no processo e redigir feedbacks construtivos. Seja sempre profissional, encorajador e direto. Responda em português do Brasil.',
      tier: 'reasoning',
      tools: [
        { collection: 'users', perms: { list: true, read: true } },
        { collection: 'tasks', perms: { list: true, read: true, update: true } },
        { collection: 'members', perms: { list: true, read: true } },
        { collection: 'feedback', perms: { list: true, read: true, create: true } },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'gestor-ia')
  },
)
