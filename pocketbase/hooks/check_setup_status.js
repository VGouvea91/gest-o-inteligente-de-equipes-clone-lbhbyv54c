// Rota: POST /backend/v1/check-setup-status
// Verifica se um email precisa definir senha (rota publica, sem auth)
routerAdd('POST', '/backend/v1/check-setup-status', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const email = (body.email || '').toString().trim()

    if (!email) return e.badRequestError('email e obrigatorio')

    let user
    try {
      user = $app.findAuthRecordByEmail('users', email)
    } catch (_) {
      return e.json(200, { exists: false, needsPasswordSetup: false })
    }

    return e.json(200, {
      exists: true,
      needsPasswordSetup: user.getBool('needs_password_setup'),
    })
  } catch (err) {
    return e.json(500, { error: 'Erro: ' + err.message })
  }
})
