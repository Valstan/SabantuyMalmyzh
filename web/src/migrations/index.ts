import * as migration_20260604_120000 from './20260604_120000'
import * as migration_20260604_140000 from './20260604_140000'
import * as migration_20260604_160000 from './20260604_160000'
import * as migration_20260606_164700 from './20260606_164700'
import * as migration_20260606_180000 from './20260606_180000'
import * as migration_20260607_010000 from './20260607_010000'
import * as migration_20260607_020000 from './20260607_020000'
import * as migration_20260618_140000 from './20260618_140000'

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
  {
    up: migration_20260604_160000.up,
    down: migration_20260604_160000.down,
    name: '20260604_160000',
  },
  {
    up: migration_20260606_164700.up,
    down: migration_20260606_164700.down,
    name: '20260606_164700',
  },
  {
    up: migration_20260606_180000.up,
    down: migration_20260606_180000.down,
    name: '20260606_180000',
  },
  {
    up: migration_20260607_010000.up,
    down: migration_20260607_010000.down,
    name: '20260607_010000',
  },
  {
    up: migration_20260607_020000.up,
    down: migration_20260607_020000.down,
    name: '20260607_020000',
  },
  {
    up: migration_20260618_140000.up,
    down: migration_20260618_140000.down,
    name: '20260618_140000',
  },
]
