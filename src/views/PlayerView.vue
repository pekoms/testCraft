<template>
  <div id="player">
    <div class="player-header">
      <h2>{{ ps.test?.title }}</h2>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="progress-label">
        <span>Pregunta {{ ps.current + 1 }} de {{ ps.questions.length }}</span>
        <span v-if="timerText">{{ timerText }}</span>
      </div>
    </div>

    <div v-if="currentQ" class="question-box">
      <div class="q-text">{{ currentQ.text }}</div>

      <!-- Open question -->
      <div v-if="currentQ.type === 'open'" class="open-answer">
        <textarea v-model="openAnswer" placeholder="Escribe tu respuesta aquí..."></textarea>
      </div>

      <!-- Single / Multiple choice -->
      <template v-else>
        <p v-if="currentQ.type === 'multiple'" style="font-size:12px;color:var(--ink3);margin-bottom:8px">Selecciona todas las correctas</p>
        <div class="options-play">
          <div
            v-for="(o, oi) in currentQ.options"
            :key="oi"
            class="option-play"
            :class="optionClass(oi)"
            @click="!isRevealed ? appStore.selectOption(oi) : null"
          >
            <div class="option-marker">
              <svg v-if="isRevealed && optionClass(oi).includes('wrong')" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <svg v-else-if="isRevealed && (optionClass(oi).includes('correct'))" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>
              <svg v-else-if="!isRevealed && currentSel.includes(oi)" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span>{{ o.text }}</span>
          </div>
        </div>

        <div v-if="isRevealed" class="feedback-banner" :class="isCurrentCorrect ? 'ok' : 'fail'">
          <svg v-if="isCurrentCorrect" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {{ isCurrentCorrect ? '¡Correcto!' : 'Incorrecto. La respuesta marcada en verde es la correcta.' }}
        </div>

        <button v-if="!isRevealed && currentQ.type === 'multiple'" class="btn accent" style="margin-top:14px" @click="appStore.revealAnswer()">
          Comprobar respuesta
        </button>
      </template>
    </div>

    <div class="player-nav">
      <button class="btn" :style="ps.current === 0 ? 'visibility:hidden' : ''" @click="prev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Anterior
      </button>
      <button class="btn accent" @click="next">
        {{ isLast ? 'Finalizar' : 'Siguiente' }}
        <svg v-if="isLast" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>

  <!-- Floating side buttons for mobile — avoid scrolling to reach nav -->
  <button
    class="player-float-btn left"
    :class="{ invisible: ps.current === 0 }"
    @click="prev"
    aria-label="Pregunta anterior"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
  <button
    class="player-float-btn right"
    :class="{ finish: isLast }"
    @click="next"
    :aria-label="isLast ? 'Finalizar test' : 'Siguiente pregunta'"
  >
    <svg v-if="isLast" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="9 18 15 12 9 6"/></svg>
  </button>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const openAnswer = ref('')
const timerText = ref('')

const ps = computed(() => appStore.playerState)
const currentQ = computed(() => ps.value.questions[ps.value.current])
const isLast = computed(() => ps.value.current === ps.value.questions.length - 1)
const isRevealed = computed(() => !!ps.value.revealed[ps.value.current])
const currentSel = computed(() => {
  const ans = ps.value.answers[ps.value.current]
  return ans ? (Array.isArray(ans) ? ans : [ans]) : []
})
const progressPct = computed(() => (ps.value.current / Math.max(ps.value.questions.length, 1)) * 100)

const isCurrentCorrect = computed(() => {
  const q = currentQ.value
  if (!q || q.type === 'open') return false
  const correctIndices = q.options.map((o, j) => o.correct ? j : -1).filter(j => j >= 0)
  const sel = currentSel.value
  return correctIndices.length === sel.length && correctIndices.every(j => sel.includes(j))
})

function optionClass(oi) {
  const q = currentQ.value
  if (!q) return ''
  const sel = currentSel.value
  const classes = []
  if (isRevealed.value) {
    const o = q.options[oi]
    if (o.correct && sel.includes(oi)) classes.push('correct')
    else if (o.correct && !sel.includes(oi)) classes.push('correct-missed')
    else if (!o.correct && sel.includes(oi)) classes.push('wrong')
    classes.push('locked')
  } else if (sel.includes(oi)) {
    classes.push('selected')
  }
  return classes.join(' ')
}

// Sync open answer back when current changes
let stopWatch = null
onMounted(() => {
  // Restore saved open answer if any
  const saved = ps.value.answers[ps.value.current]
  if (currentQ.value?.type === 'open') openAnswer.value = saved || ''

  // Start timer if needed
  if (ps.value.timeLeft > 0 && !ps.value.timerInterval) {
    const interval = setInterval(() => {
      if (appStore.playerState.timeLeft <= 0) {
        clearInterval(interval)
        timerText.value = '⏱ 0:00'
        appStore.showToast('⏱ Tiempo agotado')
        appStore.finishTest()
        return
      }
      appStore.playerState.timeLeft--
      const m = Math.floor(appStore.playerState.timeLeft / 60)
      const s = appStore.playerState.timeLeft % 60
      timerText.value = `⏱ ${m}:${String(s).padStart(2, '0')}`
    }, 1000)
    appStore.playerState.timerInterval = interval
  }
})

onUnmounted(() => {
  // Don't clear timer on unmount — finish handles that
})

function prev() {
  const ans = currentQ.value?.type === 'open' ? openAnswer.value : null
  appStore.prevQuestion(ans)
  const saved = appStore.playerState.answers[appStore.playerState.current]
  openAnswer.value = currentQ.value?.type === 'open' ? (saved || '') : ''
}

function next() {
  const ans = currentQ.value?.type === 'open' ? openAnswer.value : null
  if (isLast.value) {
    appStore.finishTest(ans)
  } else {
    appStore.nextQuestion(ans)
    const saved = appStore.playerState.answers[appStore.playerState.current]
    openAnswer.value = currentQ.value?.type === 'open' ? (saved || '') : ''
  }
}
</script>
