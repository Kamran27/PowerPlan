import { useObservable } from 'dexie-react-hooks'
import { db } from '../db'

/** E-Mail der angemeldeten Person (live), oder undefined. */
export function useMyEmail(): string | undefined {
  return useObservable(db.cloud.currentUser)?.email
}
