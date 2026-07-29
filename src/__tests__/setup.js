import { vi } from 'vitest'

// Mock router — prevents actual navigation during tests
vi.mock('@/router', () => ({
  default: { push: vi.fn(), currentRoute: { value: { query: {} } } },
}))

// Mock Supabase as null — forces localStorage fallback in stores
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  MANAGE_USERS_FN: '',
}))
