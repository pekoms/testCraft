import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import router from '@/router'

const STORE_KEY = 'testcraft_tests_v1'
const OFFLINE_CACHE_KEY = 'testcraft_offline_v1'

// Returns auth store instance (lazy import avoids circular dep at module init)
async function getAuth() {
  const { useAuthStore } = await import('./auth')
  return useAuthStore()
}

export const useAppStore = defineStore('app', () => {
  const tests = ref([])
  const currentTopic = ref(null)
  const editingId = ref(null)
  const editingQuestions = ref([])
  const isOffline = ref(false)

  const playerState = ref({
    test: null, questions: [], current: 0,
    answers: {}, revealed: {}, timerInterval: null, timeLeft: 0,
  })

  const resultData = ref(null)
  const wrongAnswers = ref([])
  const toast = ref({ text: '', show: false })
  const modal = ref({ open: false, title: '', body: '', confirmLabel: 'Eliminar', danger: true, onConfirm: null })

  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // ── Toast ──────────────────────────────────────
  let toastTimer = null
  function showToast(msg) {
    clearTimeout(toastTimer)
    toast.value = { text: msg, show: true }
    toastTimer = setTimeout(() => { toast.value = { text: '', show: false } }, 2500)
  }

  // ── Modal ──────────────────────────────────────
  function showModal(title, body, onConfirm, confirmLabel = 'Eliminar', danger = true) {
    modal.value = { open: true, title, body, confirmLabel, danger, onConfirm }
  }
  function closeModal() { modal.value.open = false }

  // ── Local storage ──────────────────────────────
  function loadTestsLocal() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || [] } catch { return [] }
  }
  function saveTestsLocal(arr) {
    localStorage.setItem(STORE_KEY, JSON.stringify(arr))
  }

  // ── Tests CRUD ─────────────────────────────────
  async function fetchTests() {
    const auth = await getAuth()
    if (supabase && auth.currentUser) {
      const cacheKey = `${OFFLINE_CACHE_KEY}_${auth.currentUser.id}`
      try {
        let q = supabase.from('tests').select('data, updated_at, published, user_id')
        if (!auth.isTeacher) q = q.eq('published', true)
        const { data, error } = await q.order('updated_at', { ascending: false })
        if (error) throw error
        const result = data.map(row => ({ ...row.data, published: row.published, _ownerId: row.user_id }))
        // Persist for offline use
        try { localStorage.setItem(cacheKey, JSON.stringify(result)) } catch {}
        isOffline.value = false
        return result
      } catch {
        // Network unavailable — serve from offline cache
        isOffline.value = true
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) return JSON.parse(cached)
        } catch {}
        return []
      }
    }
    return loadTestsLocal()
  }

  async function persistTest(test) {
    const auth = await getAuth()
    if (supabase && auth.currentUser) {
      const existing = tests.value.find(x => x.id === test.id)
      const ownerId = existing?._ownerId || auth.currentUser.id
      const { error } = await supabase.from('tests').upsert({
        id: test.id,
        user_id: ownerId,
        data: test,
        published: !!test.published,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,id' })
      if (error) { showToast('Error al guardar en la nube'); return false }
      return true
    }
    const arr = loadTestsLocal()
    const idx = arr.findIndex(x => x.id === test.id)
    if (idx >= 0) arr[idx] = test; else arr.push(test)
    saveTestsLocal(arr)
    return true
  }

  async function removeTest(id) {
    const auth = await getAuth()
    if (supabase && auth.currentUser) {
      const existing = tests.value.find(x => x.id === id)
      const ownerId = existing?._ownerId || auth.currentUser.id
      const { error, count } = await supabase.from('tests').delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', ownerId)
      if (error) { showToast('Error al eliminar'); return false }
      if (count === 0) { showToast('No se pudo eliminar el test'); return false }
      return true
    }
    saveTestsLocal(loadTestsLocal().filter(x => x.id !== id))
    return true
  }

  async function togglePublish(id) {
    const t = tests.value.find(x => x.id === id)
    if (!t) return
    t.published = !t.published
    const ok = await persistTest(t)
    if (!ok) { t.published = !t.published; return }
    showToast(t.published ? 'Test publicado para los alumnos ✓' : 'Test ocultado (borrador)')
  }

  function deleteTest(id) {
    const t = tests.value.find(x => x.id === id)
    if (!t) return
    showModal(`Eliminar "${t.title}"`, '¿Seguro? Esta acción no se puede deshacer.', async () => {
      const ok = await removeTest(id)
      if (!ok) return
      tests.value = tests.value.filter(x => x.id !== id)
      showToast('Test eliminado')
    })
  }

  async function duplicateTest(id) {
    const auth = await getAuth()
    const t = tests.value.find(x => x.id === id)
    if (!t) return
    const copy = {
      ...JSON.parse(JSON.stringify(t)),
      id: genId(),
      title: 'Copia de ' + t.title,
      published: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    delete copy._ownerId
    const ok = await persistTest(copy)
    if (!ok) return
    tests.value.unshift({ ...copy, _ownerId: auth.currentUser?.id })
    showToast('Test duplicado ✓')
  }

  // ── Player ─────────────────────────────────────
  async function startTest(id) {
    const auth = await getAuth()
    const t = tests.value.find(x => x.id === id)
    if (!t || !t.questions.length) { showToast('Este test no tiene preguntas'); return }

    if (!auth.isTeacher) {
      if (t.deadline && new Date() > new Date(t.deadline)) {
        showToast('El plazo de entrega ha vencido'); return
      }
      if (t.maxAttempts > 0 && supabase && auth.currentUser) {
        const { count } = await supabase
          .from('test_results')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.currentUser.id)
          .eq('test_id', id)
        if (count >= t.maxAttempts) {
          showToast(`Has alcanzado el límite de ${t.maxAttempts} intento${t.maxAttempts !== 1 ? 's' : ''} para este test`)
          return
        }
      }
    }

    let qs = JSON.parse(JSON.stringify(t.questions))
    if (t.shuffle) qs = shuffle(qs)

    clearInterval(playerState.value.timerInterval)
    playerState.value = {
      test: t, questions: qs, current: 0,
      answers: {}, revealed: {}, timerInterval: null,
      timeLeft: (t.timeLimit || 0) * 60,
      startedAt: Date.now(),
      _retryContext: { type: 'normal', testId: id },
    }
    router.push('/player')
  }

  function selectOption(oi) {
    const { questions, current, revealed } = playerState.value
    const q = questions[current]
    if (revealed[current]) return
    if (q.type === 'multiple') {
      const sel = playerState.value.answers[current] ? [...playerState.value.answers[current]] : []
      const idx = sel.indexOf(oi)
      if (idx >= 0) sel.splice(idx, 1); else sel.push(oi)
      playerState.value.answers = { ...playerState.value.answers, [current]: sel }
    } else {
      playerState.value.answers = { ...playerState.value.answers, [current]: [oi] }
      playerState.value.revealed = { ...playerState.value.revealed, [current]: true }
    }
  }

  function revealAnswer() {
    const { current } = playerState.value
    const sel = playerState.value.answers[current]
    if (!sel || !sel.length) { showToast('Selecciona al menos una opción'); return }
    playerState.value.revealed = { ...playerState.value.revealed, [current]: true }
  }

  function saveCurrentAnswer(openAnswerText) {
    const { questions, current } = playerState.value
    const q = questions[current]
    if (q?.type === 'open' && openAnswerText != null) {
      playerState.value.answers = { ...playerState.value.answers, [current]: openAnswerText.trim() || null }
    }
  }

  function nextQuestion(openAnswerText) {
    saveCurrentAnswer(openAnswerText)
    const { questions, current } = playerState.value
    if (current === questions.length - 1) { finishTest(); return }
    playerState.value = { ...playerState.value, current: current + 1 }
  }

  function prevQuestion(openAnswerText) {
    saveCurrentAnswer(openAnswerText)
    if (playerState.value.current === 0) return
    playerState.value = { ...playerState.value, current: playerState.value.current - 1 }
  }

  async function finishTest(openAnswerText) {
    saveCurrentAnswer(openAnswerText)
    clearInterval(playerState.value.timerInterval)
    playerState.value.timerInterval = null

    const { questions, answers } = playerState.value
    let correct = 0, total = 0
    const reviewItems = questions.map((q, i) => {
      const ans = answers[i]
      if (q.type === 'open') return { q, ans, type: 'open' }
      total++
      const correctIndices = q.options.map((o, j) => o.correct ? j : -1).filter(j => j >= 0)
      const selArr = ans ? (Array.isArray(ans) ? ans : [ans]) : []
      const isCorrect = correctIndices.length === selArr.length && correctIndices.every(j => selArr.includes(j))
      if (isCorrect) correct++
      return { q, ans: selArr, correctIndices, isCorrect }
    })

    const pct = total > 0 ? Math.round((correct / total) * 100) : null

    const answerSummary = reviewItems.map(item => {
      if (item.type === 'open') return { q: item.q.text, type: 'open', ok: null, ans: item.ans || '' }
      const selLabels = item.ans.map(j => item.q.options[j]?.text).filter(Boolean)
      const corrLabels = item.correctIndices.map(j => item.q.options[j]?.text).filter(Boolean)
      return {
        q: item.q.text, type: item.q.type, ok: item.isCorrect,
        ans: selLabels.join(', ') || '—', correct: corrLabels.join(', '),
        question: item.isCorrect ? undefined : item.q,
      }
    })

    const durationSeconds = playerState.value.startedAt
      ? Math.round((Date.now() - playerState.value.startedAt) / 1000)
      : null

    saveTestResult(pct, correct, total, answerSummary, durationSeconds)
    resultData.value = { pct, correct, total, reviewItems, test: playerState.value.test, durationSeconds, retryContext: playerState.value._retryContext || null }
    router.push('/results')

    // Optimistic local update — runs after navigation so the sync path above
    // stays unblocked; wrongAnswers is reactive so HomeView reflects it instantly.
    const auth = await getAuth()
    if (!auth.isTeacher || auth.isAdmin) {
      const justCorrectTexts = new Set(
        reviewItems.filter(i => i.type !== 'open' && i.isCorrect).map(i => i.q.text)
      )
      wrongAnswers.value = wrongAnswers.value.filter(q => !justCorrectTexts.has(q.text))
      const existingTexts = new Set(wrongAnswers.value.map(q => q.text))
      reviewItems.forEach(item => {
        if (item.type === 'open' || item.isCorrect) return
        if (!existingTexts.has(item.q.text)) wrongAnswers.value = [...wrongAnswers.value, item.q]
      })
    }
  }

  async function saveTestResult(score, correct, total, answers = [], durationSeconds = null) {
    const auth = await getAuth()
    if (!supabase || !auth.currentUser) return
    try {
      await supabase.from('test_results').insert({
        user_id: auth.currentUser.id,
        test_id: playerState.value.test.id,
        test_title: playerState.value.test.title,
        score, correct, total, answers,
        duration_seconds: durationSeconds,
      })
      // Sync canonical state from DB (catches edge cases the optimistic update may miss)
      await loadWrongAnswers()
    } catch (e) { console.error('Stats save error:', e) }
  }

  // ── Import ─────────────────────────────────────
  async function importTestObj(t) {
    const auth = await getAuth()
    if (!t || !t.id || !t.title || !t.questions) { showToast('Test no válido'); return }
    if (!auth.isTeacher) {
      const temp = { ...t, id: 'temp_' + genId(), published: true }
      showModal(`Test compartido: "${t.title}"`, '¿Quieres hacer este test ahora?', () => {
        tests.value.push(temp); startTest(temp.id)
      }, 'Empezar', false)
      return
    }
    const exists = tests.value.find(x => x.id === t.id)
    if (exists) {
      showToast('Este test ya está en tu biblioteca')
    } else {
      const copy = { ...t, id: genId(), createdAt: Date.now(), updatedAt: Date.now() }
      const ok = await persistTest(copy)
      if (ok) { tests.value.unshift(copy); t = copy; showToast(`Test "${t.title}" importado ✓`) }
    }
    setTimeout(() => showModal(`Test compartido: "${t.title}"`, '¿Quieres empezar el test ahora?', () => startTest(t.id), 'Empezar', false), 400)
  }

  async function checkImportFromUrl() {
    const params = new URLSearchParams(location.search)
    const binId = params.get('bin'), encoded = params.get('test')
    if (binId) {
      try {
        const headers = JSONBIN_KEY ? { 'X-Master-Key': JSONBIN_KEY } : {}
        const res = await fetch(JSONBIN_BASE + '/b/' + binId + '/latest', { headers })
        if (!res.ok) throw new Error()
        importTestObj((await res.json()).record)
      } catch { showToast('No se pudo cargar el test compartido') }
      window.history.replaceState({}, '', location.pathname)
      return
    }
    if (encoded) {
      try { importTestObj(JSON.parse(decodeURIComponent(escape(atob(encoded))))) }
      catch { showToast('Error al importar el test') }
      window.history.replaceState({}, '', location.pathname)
    }
  }

  // ── Topics ─────────────────────────────────────
  function showTopic(topic) { currentTopic.value = topic }
  function backToTopics() { currentTopic.value = null }

  // ── Retry wrong only (from current result) ─────
  function retryWrongOnly() {
    if (!resultData.value) return
    const wrongQs = shuffle(
      resultData.value.reviewItems
        .filter(item => item.type !== 'open' && !item.isCorrect)
        .map(item => item.q)
    )
    if (!wrongQs.length) return
    clearInterval(playerState.value.timerInterval)
    playerState.value = {
      test: resultData.value.test,
      questions: wrongQs,
      current: 0, answers: {}, revealed: {}, timerInterval: null, timeLeft: 0,
      startedAt: Date.now(),
      _retryContext: { type: 'wrongOnly' },
    }
    router.push('/player')
  }

  // ── Wrong answers across all tests ─────────────
  async function loadWrongAnswers() {
    const auth = await getAuth()
    if (!supabase || !auth.currentUser || (auth.isTeacher && !auth.isAdmin)) {
      wrongAnswers.value = []
      return
    }
    let clearedAt = null
    try {
      const ts = localStorage.getItem(`wca_${auth.currentUser.id}`)
      if (ts) clearedAt = ts
    } catch {}

    let query = supabase
      .from('test_results')
      .select('answers')
      .eq('user_id', auth.currentUser.id)
      .order('completed_at', { ascending: false })
    if (clearedAt) query = query.gt('completed_at', clearedAt)

    const { data } = await query
    if (!data) return
    // Results come newest-first. Track questions answered correctly in a recent
    // attempt so that a later wrong attempt on the same question doesn't surface.
    const seenCorrect = new Set()
    const seenWrong = new Set()
    const wrong = []
    data.forEach(r => {
      ;(r.answers || []).forEach(a => {
        if (a.type === 'open') return
        const key = a.q
        if (a.ok === true) seenCorrect.add(key)
        if (a.ok === false && a.question && !seenCorrect.has(key) && !seenWrong.has(key)) {
          seenWrong.add(key)
          wrong.push(a.question)
        }
      })
    })
    wrongAnswers.value = wrong
  }

  async function clearWrongAnswers() {
    wrongAnswers.value = []
    const auth = await getAuth()
    if (!auth.currentUser) return
    try { localStorage.setItem(`wca_${auth.currentUser.id}`, new Date().toISOString()) } catch {}
  }

  // ── Custom test ────────────────────────────────
  // Builds a deduplicated pool of non-open questions from the given tests (by question text).
  function buildPool(testList) {
    const seen = new Set()
    const pool = []
    testList.forEach(t => t.questions.forEach(q => {
      if (q.type !== 'open' && !seen.has(q.text)) {
        seen.add(q.text)
        pool.push(q)
      }
    }))
    return pool
  }

  function countAvailableQuestions() {
    return buildPool(tests.value).length
  }

  function startTopicTest(topic) {
    const pool = buildPool(tests.value.filter(t => (t.topic || '') === topic))
    if (!pool.length) { showToast('No hay preguntas disponibles en este tema'); return }
    const qs = shuffle(pool)
    clearInterval(playerState.value.timerInterval)
    playerState.value = {
      test: { id: 'topic_' + Date.now(), title: `${topic || 'Sin tema'} — Tema completo` },
      questions: qs,
      current: 0, answers: {}, revealed: {}, timerInterval: null, timeLeft: 0,
      startedAt: Date.now(),
      _retryContext: { type: 'topic', topic },
    }
    router.push('/player')
  }

  function startCustomTest(numQuestions) {
    const pool = buildPool(tests.value)
    if (!pool.length) { showToast('No hay preguntas disponibles'); return }
    const n = Math.min(Math.max(1, numQuestions), pool.length)
    const qs = shuffle(pool).slice(0, n)
    clearInterval(playerState.value.timerInterval)
    playerState.value = {
      test: { id: 'custom_' + Date.now(), title: `Test personalizado (${n} preguntas)` },
      questions: qs,
      current: 0, answers: {}, revealed: {}, timerInterval: null, timeLeft: 0,
      startedAt: Date.now(),
      _retryContext: { type: 'custom', numQuestions: n },
    }
    router.push('/player')
  }

  async function startWrongAnswersTest() {
    if (!wrongAnswers.value.length) return
    const qs = shuffle(wrongAnswers.value)
    clearInterval(playerState.value.timerInterval)
    playerState.value = {
      test: { id: 'wrong_' + Date.now(), title: 'Repaso de errores', questions: qs },
      questions: qs,
      current: 0, answers: {}, revealed: {}, timerInterval: null, timeLeft: 0,
      startedAt: Date.now(),
      _retryContext: { type: 'wrong' },
    }
    router.push('/player')
  }

  return {
    tests, currentTopic, editingId, editingQuestions, playerState, resultData, wrongAnswers, toast, modal, isOffline,
    genId, showToast, showModal, closeModal,
    fetchTests, persistTest, removeTest, togglePublish, deleteTest, duplicateTest,
    startTest, retryWrongOnly, loadWrongAnswers, startWrongAnswersTest,
    clearWrongAnswers, countAvailableQuestions, startCustomTest, startTopicTest,
    nextQuestion, prevQuestion, selectOption, revealAnswer, finishTest, saveCurrentAnswer,
    checkImportFromUrl, showTopic, backToTopics,
  }
})
