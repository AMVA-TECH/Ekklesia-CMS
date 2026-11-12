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
  updateMyProfileBodySchema,
  createPersonContactBodySchema,
  listPeopleQuerySchema,
  listDirectoryQuerySchema,
  personResponseSchema,
  directoryEntryResponseSchema,
  type CreatePersonBody,
  type UpdatePersonBody,
  type UpdateMyProfileBody,
  type CreatePersonContactBody,
  type ListPeopleQuery,
  type ListDirectoryQuery,
  type PersonResponse,
  type DirectoryEntryResponse,
} from './schemas';
export {
  listPeople,
  getPerson,
  createPerson,
  updatePerson,
  getMyProfile,
  updateMyProfile,
  addPersonContact,
  listDirectory,
} from './service';
