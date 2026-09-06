import countries from 'i18n-iso-countries'
import englishLocale from 'i18n-iso-countries/langs/en.json'
import spanishLocale from 'i18n-iso-countries/langs/es.json'

countries.registerLocale(englishLocale)
countries.registerLocale(spanishLocale)

const aliases: Record<string, string> = {
  'Arabia Saudí': 'Arabia Saudita',
  'Bangladés': 'Bangladesh',
  'Baréin': 'Bahréin',
  'Benín': 'Benin',
  'Botsuana': 'Botswana',
  'Corea del Sur': 'Corea, República de',
  'Irak': 'Iraq',
  'Laos': 'República Democrática Popular Lao',
  'SudAfrica': 'Sudáfrica',
  'Myanmar (Birmania)': 'Myanmar',
  'República de Gambia': 'Gambia',
  'Macedonia': 'Macedonia del Norte',
  'Papúa Nueva Guinea': 'Papúa-Nueva Guinea',
  'República del Congo': 'Congo',
  'República Democrática del Congo': 'Congo, República Democrática del',
  'Rumania': 'Rumanía',
  'Sáhara Occidental': 'Sahara Occidental',
  'Siria': 'República Árabe Siria',
  'Suazilandia': 'Eswatini',
  'Surinam': 'Suriname',
}

// Product terminology intentionally differs from the ISO long-form name.
const preferredEnglishNames: Record<string, string> = {
  CN: 'China',
  US: 'United States',
}

const numericByAlpha2 = Object.fromEntries(
  Object.entries(countries.getNumericCodes()).map(([numeric, alpha2]) => [alpha2, numeric]),
) as Record<string, string>

export function countryAlpha2(rawName: string) {
  const normalized = aliases[rawName] || rawName
  return countries.getAlpha2Code(normalized, 'es') || countries.getAlpha2Code(normalized, 'en')
}

export function displayCountryName(rawName: string) {
  const alpha2 = countryAlpha2(rawName)
  return alpha2 ? preferredEnglishNames[alpha2] || countries.getName(alpha2, 'en') || rawName : rawName
}

export function countryNumericId(rawName: string) {
  const alpha2 = countryAlpha2(rawName)
  return alpha2 ? numericByAlpha2[alpha2] : undefined
}
