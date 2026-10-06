// Rota: POST /backend/v1/delete-member
// Admin remove um funcionario da equipe.
// Remove o registro em members e opcionalmente o usuario (se nao estiver em
// outras equipes). O admin nao pode remover a si mesmo.
routerAdd(
  'POST',
  '/backend/v1/delete-member',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) return e.unauthorizedError('Autenticacao requerida')
      if (authRecord.getString('role') !== 'admin') {
        return e.forbiddenError('Apenas administradores podem remover funcionarios')
      }

      const body = e.requestInfo().body || {}
      const memberId = (body.memberId || '').toString().trim()

      if (!memberId) return e.badRequestError('memberId e obrigatorio')

      // 1. Carregar o registro de membro
      let member
      try {
        member = $app.findRecordById('members', memberId)
      } catch (_) {
        return e.json(404, { error: 'Membro nao encontrado' })
      }

      const userId = member.getString('user')

      // 2. Impedir auto-remocao
      if (userId === authRecord.id) {
        return e.json(400, { error: 'Voce nao pode remover a si mesmo da equipe' })
      }

      // 3. Remover o registro de membro
      $app.delete(member)

      // 4. Verificar se o usuario pertence a outras equipes
      let otherMemberships = 0
      try {
        otherMemberships = $app.countRecords('members', {
          filter: 'user = {:userId}',
          params: { userId },
        })
      } catch (_) {
        // Se falhar, assumir 0
      }

      // 5. Se nao ha outras equipes, remover o usuario tambem
      let userDeleted = false
      if (otherMemberships === 0) {
        try {
          const user = $app.findRecordById('users', userId)
          $app.delete(user)
          userDeleted = true
        } catch (_) {
          // Usuario ja removido ou inacessivel
        }
      }

      $app
        .logger()
        .info('delete-member', 'memberId', memberId, 'userId', userId, 'userDeleted', userDeleted)

      return e.json(200, {
        success: true,
        memberId,
        userDeleted,
      })
    } catch (err) {
      $app.logger().error('delete-member failed', 'error', err.message)
      return e.json(500, { error: 'Erro ao remover funcionario: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
