interface FilterResult {
  text: string
  flagged: boolean
  flagType: string | null
  matches: string[]
}

const PHONE_REGEX = /(?:\+?61|0)\s*[2-9](?:\s*\d){7,9}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const INSTAGRAM_REGEX = /@[a-zA-Z0-9._]{2,30}(?=\s|$|[^a-zA-Z0-9._])/g
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/gi
const ADDRESS_REGEX = /\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s+(?:St(?:reet)?|Rd|Road|Ave(?:nue)?|Dr(?:ive)?|Cr(?:es(?:cent)?)?|Ct|Court|Pl(?:ace)?|Ln|Lane|Way|Blvd|Boulevard|Tce|Terrace|Pde|Parade|Cct|Circuit|Cl|Close|Gr|Grove|Hwy|Highway)\b/gi
const POSTCODE_REGEX = /\b(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*\d{4}\b/gi
const PAYMENT_REGEX = /\b(?:paypal|venmo|zelle|cash\s*app|bank\s*transfer|direct\s*deposit|bsb|account\s*num(?:ber)?|pay\s*(?:me\s*)?(?:direct(?:ly)?|outside|cash)|wire\s*transfer)\b/gi
const SOCIAL_REGEX = /\b(?:(?:find|add|follow|message|dm|text|hit)\s+(?:me|us)\s+(?:on|at|via)\s+(?:insta(?:gram)?|facebook|fb|tiktok|whatsapp|telegram|wechat|snapchat|signal|viber))\b/gi

export function filterContactInfo(input: string): FilterResult {
  const matches: string[] = []
  let flagType: string | null = null
  let text = input

  // Check phone numbers
  const phones = input.match(PHONE_REGEX)
  if (phones) {
    matches.push(...phones)
    flagType = 'PHONE'
    text = text.replace(PHONE_REGEX, '[contact info hidden]')
  }

  // Check emails
  const emails = input.match(EMAIL_REGEX)
  if (emails) {
    matches.push(...emails)
    flagType = flagType ? 'MULTIPLE' : 'EMAIL'
    text = text.replace(EMAIL_REGEX, '[contact info hidden]')
  }

  // Check Instagram handles
  const instas = input.match(INSTAGRAM_REGEX)
  if (instas) {
    // Filter out common words that start with @
    const filtered = instas.filter(h => !['@home', '@studio', '@the', '@a', '@an', '@my', '@your', '@all', '@get', '@back', '@new', '@best', '@top', '@is', '@on', '@in', '@at', '@or', '@if', '@we', '@it', '@so', '@no', '@yes', '@pm', '@am', '@to', '@of', '@for', '@and', '@but', '@not', '@out', '@up', '@off'].includes(h.toLowerCase()))
    if (filtered.length > 0) {
      matches.push(...filtered)
      flagType = flagType ? 'MULTIPLE' : 'INSTAGRAM'
      for (const handle of filtered) {
        text = text.replace(handle, '[contact info hidden]')
      }
    }
  }

  // Check URLs
  const urls = input.match(URL_REGEX)
  if (urls) {
    matches.push(...urls)
    flagType = flagType ? 'MULTIPLE' : 'URL'
    text = text.replace(URL_REGEX, '[contact info hidden]')
  }

  // Check street addresses
  const addresses = input.match(ADDRESS_REGEX)
  if (addresses) {
    matches.push(...addresses)
    flagType = flagType ? 'MULTIPLE' : 'ADDRESS'
    text = text.replace(ADDRESS_REGEX, '[contact info hidden]')
  }

  // Check postcodes
  const postcodes = input.match(POSTCODE_REGEX)
  if (postcodes) {
    matches.push(...postcodes)
    flagType = flagType ? 'MULTIPLE' : 'POSTCODE'
    text = text.replace(POSTCODE_REGEX, '[contact info hidden]')
  }

  // Check off-platform payment keywords
  const payments = input.match(PAYMENT_REGEX)
  if (payments) {
    matches.push(...payments)
    flagType = flagType ? 'MULTIPLE' : 'PAYMENT'
    text = text.replace(PAYMENT_REGEX, '[contact info hidden]')
  }

  // Check social media solicitation
  const socials = input.match(SOCIAL_REGEX)
  if (socials) {
    matches.push(...socials)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(SOCIAL_REGEX, '[contact info hidden]')
  }

  return {
    text,
    flagged: matches.length > 0,
    flagType,
    matches,
  }
}
