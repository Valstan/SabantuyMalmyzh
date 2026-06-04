import * as migration_20260604_120000 from './20260604_120000'
import * as migration_20260604_140000 from './20260604_140000'

export const migrations = [
  {
    up: migration_20260604_120000.up,
    down: migration_20260604_120000.down,
    name: '20260604_120000',
  },
  {
    up: migration_20260604_140000.up,
    down: migration_20260604_140000.down,
    name: '20260604_140000',
  },
]
