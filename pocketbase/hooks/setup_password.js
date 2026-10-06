// Rota: POST /backend/v1/setup-password
// Funcionario define sua propria senha no primeiro login.
// Funciona para usuarios com needs_password_setup=true.
routerAdd(
  'POST',
  '/backend/v1/setup-password',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const email = (body.email || '').toString().trim()
      const password = (body.password || '').toString().trim()

      if (!email) return e.badRequestError('email e obrigatorio')
      if (!password || password.length < 8) {
        return e.badRequestError('Senha deve ter no minimo 8 caracteres')
      }

      // 1. Buscar usuario pelo email
      let user
      try {
        user = $app.findAuthRecordByEmail('users', email)
      } catch (_) {
        return e.badRequestError('Usuario nao encontrado')
      }

      // 2. Verificar se precisa definir senha
      const needsSetup = user.getBool('needs_password_setup')
      if (!needsSetup) {
        return e.badRequestError('Senha ja definida. Use o login normal.')
      }

      // 3. Definir nova senha e marcar como configurada
      user.setPassword(password)
      user.set('needs_password_setup', false)
      user.setVerified(true)
      $app.save(user)

      $app.logger().info('setup-password', 'email', email, 'userId', user.id)

      return e.json(200, {
        success: true,
        message: 'Senha definida com sucesso. Faca login para continuar.',
      })
    } catch (err) {
      $app.logger().error('setup-password failed', 'error', err.message)
      return e.json(500, { error: 'Erro ao definir senha: ' + err.message })
    }
  },
  // Nao requer auth — rota usada antes do primeiro login
)
