// Rota: POST /backend/v1/update-member
// Admin atualiza dados de um funcionario (nome, email, role).
// Atualiza o registro em users e o role no members.
routerAdd(
  'POST',
  '/backend/v1/update-member',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) return e.unauthorizedError('Autenticacao requerida')
      if (authRecord.getString('role') !== 'admin') {
        return e.forbiddenError('Apenas administradores podem editar funcionarios')
      }

      const body = e.requestInfo().body || {}
      const memberId = (body.memberId || '').toString().trim()
      const name = (body.name || '').toString().trim()
      const email = (body.email || '').toString().trim()
      const role = (body.role || 'member').toString().trim()

      if (!memberId) return e.badRequestError('memberId e obrigatorio')

      const validRoles = ['admin', 'member']
      const memberRole = validRoles.includes(role) ? role : 'member'

      // 1. Carregar o registro de membro
      let member
      try {
        member = $app.findRecordById('members', memberId)
      } catch (_) {
        return e.json(404, { error: 'Membro nao encontrado' })
      }

      const userId = member.getString('user')

      // 2. Carregar o usuario relacionado
      let user
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {
        return e.json(404, { error: 'Usuario nao encontrado' })
      }

      // 3. Atualizar campos do usuario
      if (name) user.set('name', name)
      if (email) {
        // Verificar se o email ja esta em uso por outro usuario
        if (email !== user.getString('email')) {
          try {
            const existing = $app.findAuthRecordByEmail('users', email)
            if (existing.id !== user.id) {
              return e.json(400, { error: 'Email ja cadastrado para outro usuario' })
            }
          } catch (_) {
            // Email disponivel
          }
          user.set('email', email)
          user.set('emailVisibility', true)
        }
      }
      user.set('role', memberRole)
      $app.save(user)

      // 4. Atualizar role no registro de membro
      member.set('role', memberRole)
      $app.save(member)

      $app
        .logger()
        .info('update-member', 'memberId', memberId, 'userId', userId, 'role', memberRole)

      return e.json(200, {
        success: true,
        userId: user.id,
        memberId: member.id,
      })
    } catch (err) {
      $app.logger().error('update-member failed', 'error', err.message)
      return e.json(500, { error: 'Erro ao editar funcionario: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
