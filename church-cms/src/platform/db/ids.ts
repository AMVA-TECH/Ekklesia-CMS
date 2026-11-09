import { v7 as uuidv7 } from 'uuid';

/** Time-ordered UUID for primary keys (app-generated). */
export function newId(): string {
  return uuidv7();
}
