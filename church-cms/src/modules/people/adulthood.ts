/** Adulthood threshold (DEC / age-band decision): 18 years. */
export const ADULTHOOD_AGE_YEARS = 18;

export function isAdult(dateOfBirth: Date | string, asOf: Date = new Date()): boolean {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return false;

  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= ADULTHOOD_AGE_YEARS;
}
