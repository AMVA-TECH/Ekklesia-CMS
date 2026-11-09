export {
  people,
  personContacts,
  userAccounts,
  organisationUsers,
} from './db-schema';
export { ADULTHOOD_AGE_YEARS, isAdult } from './adulthood';
export {
  CONTACT_CHANNELS,
  LOCALES,
  USER_ACCOUNT_STATUSES,
  type ContactChannel,
  type Locale,
  type UserAccountStatus,
} from './constants';
export {
  createPersonBodySchema,
  updatePersonBodySchema,
  listPeopleQuerySchema,
  personResponseSchema,
  type CreatePersonBody,
  type UpdatePersonBody,
  type ListPeopleQuery,
  type PersonResponse,
} from './schemas';
export { listPeople, getPerson, createPerson, updatePerson } from './service';
