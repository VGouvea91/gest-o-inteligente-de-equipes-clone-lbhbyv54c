onRecordAfterCreateSuccess((e) => {
  const text = (e.record.getString('title') + '\n\n' + e.record.getString('description')).trim()
  if (!text) return e.next()
  try {
    const res = $ai.embed({ input: text })
    const record = $app.findRecordById('tasks', e.record.id)
    record.set('vector', res.data[0].embedding)
    $app.save(record)
  } catch (err) {
    console.log('embedding failed for task ' + e.record.id, err.message)
  }
  return e.next()
}, 'tasks')
