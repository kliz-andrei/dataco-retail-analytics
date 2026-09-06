import countries from 'i18n-iso-countries'
import spanishLocale from 'i18n-iso-countries/langs/es.json'

countries.registerLocale(spanishLocale)

const aliases: Record<string, string> = {
  'SudAfrica': 'Sudáfrica',
  'Myanmar (Birmania)': 'Myanmar',
  'República de Gambia': 'Gambia',
  'Macedonia': 'Macedonia del Norte',
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
  return alpha2 ? countries.getName(alpha2, 'en') || rawName : rawName
}

export function countryNumericId(rawName: string) {
  const alpha2 = countryAlpha2(rawName)
  return alpha2 ? numericByAlpha2[alpha2] : undefined
}
