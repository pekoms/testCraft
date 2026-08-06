<template>
  <div id="results">
    <div class="score-hero">
      <div class="score-num">{{ pct !== null ? pct + '%' : '—' }}</div>
      <div class="score-label">
        {{ pct !== null ? `${correct} de ${total} preguntas correctas` : 'Test de respuesta abierta — revisión manual' }}
      </div>
      <div v-if="durationSeconds !== null" class="score-time">⏱ {{ fmtDuration(durationSeconds) }}</div>
    </div>

    <div class="section-title">Revisión de respuestas</div>
    <div class="review-list">
      <div v-for="(item, i) in reviewItems" :key="i"
        class="review-item"
        :class="item.type === 'open' ? 'open' : item.isCorrect ? 'ok' : 'fail'"
      >
        <div class="review-q">{{ item.q.text }}</div>
        <div class="review-answer">
          <template v-if="item.type === 'open'">
            <span class="tag open">Abierta</span>
            <span v-if="item.ans">{{ item.ans }}</span>
            <em v-else style="color:var(--ink3)">Sin respuesta</em>
          </template>
          <template v-else>
            <span class="tag" :class="item.isCorrect ? 'ok' : 'fail'">{{ item.isCorrect ? '✓ Correcto' : '✗ Incorrecto' }}</span>
            <template v-if="!item.isCorrect">
              <br>
              <span style="color:var(--ink3);font-size:12px">Tu respuesta: {{ selLabels(item) || '—' }}</span>
              <br>
              <span style="color:var(--accent2);font-size:12px">Correcta: {{ corrLabels(item) }}</span>
            </template>
            <template v-else>
              <span style="color:var(--ink2);font-size:12px">{{ selLabels(item) }}</span>
            </template>
          </template>
        </div>
      </div>
    </div>

    <div class="results-actions">
      <button class="btn" @click="router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
        Inicio
      </button>
      <button class="btn" :disabled="!wrongCount" @click="appStore.retryWrongOnly()"
        :title="wrongCount ? `Repetir solo las ${wrongCount} preguntas falladas` : 'No hay preguntas incorrectas'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
        </svg>
        Solo erróneos{{ wrongCount ? ` (${wrongCount})` : '' }}
      </button>
      <button class="btn accent" @click="retry">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-4.16"/>
        </svg>
        Reintentar
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()

const pct = computed(() => appStore.resultData?.pct ?? null)
const correct = computed(() => appStore.resultData?.correct ?? 0)
const total = computed(() => appStore.resultData?.total ?? 0)
const reviewItems = computed(() => appStore.resultData?.reviewItems ?? [])
const durationSeconds = computed(() => appStore.resultData?.durationSeconds ?? null)

const wrongCount = computed(() =>
  reviewItems.value.filter(item => item.type !== 'open' && !item.isCorrect).length
)

function selLabels(item) {
  return item.ans.map(j => item.q.options[j]?.text).filter(Boolean).join(', ')
}
function corrLabels(item) {
  return item.correctIndices.map(j => item.q.options[j]?.text).filter(Boolean).join(', ')
}

function fmtDuration(s) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), sec = s % 60
  return sec > 0 ? `${m} min ${sec}s` : `${m} min`
}

function retry() {
  if (appStore.resultData?.test) appStore.startTest(appStore.resultData.test.id)
}
</script>
