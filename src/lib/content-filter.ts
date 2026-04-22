interface FilterResult {
  text: string
  flagged: boolean
  flagType: string | null
  matches: string[]
}

const PHONE_REGEX = /(?:\+?61|0)\s*[2-9](?:\s*\d){7,9}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const INSTAGRAM_REGEX = /@[a-zA-Z0-9._]{2,30}(?=\s|$|[^a-zA-Z0-9._])/g
const TIKTOK_REGEX = /@[a-zA-Z0-9_.]{1,24}|tiktok\.com\/@?[a-zA-Z0-9_.]+/gi
const TELEGRAM_REGEX = /t\.me\/[a-zA-Z0-9_]+|telegram\.me\/[a-zA-Z0-9_]+|@[a-zA-Z0-9_]{5,32}/gi
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/gi
const ADDRESS_REGEX = /\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s+(?:St(?:reet)?|Rd|Road|Ave(?:nue)?|Dr(?:ive)?|Cr(?:es(?:cent)?)?|Ct|Court|Pl(?:ace)?|Ln|Lane|Way|Blvd|Boulevard|Tce|Terrace|Pde|Parade|Cct|Circuit|Cl|Close|Gr|Grove|Hwy|Highway)\b/gi
const POSTCODE_REGEX = /\b(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*\d{4}\b/gi
const PAYMENT_REGEX = /\b(?:paypal|venmo|zelle|cash\s*app|bank\s*transfer|direct\s*deposit|bsb|account\s*num(?:ber)?|pay\s*(?:me\s*)?(?:direct(?:ly)?|outside|cash)|wire\s*transfer)\b/gi
const SOCIAL_REGEX = /\b(?:(?:find|add|follow|message|dm|text|hit)\s+(?:me|us)\s+(?:on|at|via)\s+(?:insta(?:gram)?|facebook|fb|tiktok|whatsapp|telegram|wechat|snapchat|signal|viber))\b/gi

// Bare social platform prefix patterns: "ig: goldnails", "insta: goldnails_sydney"
const PLATFORM_PREFIX_REGEX = /\b(?:ig|insta|instagram|fb|facebook|tiktok|tik\s*tok|wa|whatsapp|wapp|telegram|tg|snap|snapchat|signal|viber|wechat)\s*:?\s*[@]?[a-zA-Z0-9._]{3,30}\b/gi

// "My [platform] is [handle]" pattern
const MY_PLATFORM_REGEX = /\b(?:my|our)\s+(?:ig|insta|instagram|facebook|fb|tiktok|whatsapp|telegram|snap)\s+(?:is|handle\s+is|account\s+is|page\s+is)?\s*[@]?[a-zA-Z0-9._]{3,30}\b/gi

// "Book/contact/reach me outside" patterns
const BYPASS_REGEX = /\b(?:book|contact|reach|message|text|call|dm)\s+(?:me|us)\s+(?:outside|off|directly|direct|elsewhere|privately|offsite|off\s*platform|off\s*-\s*app)\b/gi

// P2-8: WhatsApp direct links (wa.me, whatsapp.com/send, chat.whatsapp.com)
const WHATSAPP_REGEX = /(?:wa\.me|whatsapp\.com\/send|chat\.whatsapp\.com)\/[^\s]*/gi

// P2-8: QR code solicitation — asking customers to scan a QR/barcode to go off-platform
const QR_SOLICITATION_REGEX = /(?:scan\s+(?:my\s+)?(?:qr|barcode)|(?:qr|barcode)\s+(?:code\s+)?(?:to|scan|for))/gi

// P2-8: Coded off-platform language — "dm me on another app", "find me on the other", etc.
const OFF_PLATFORM_REGEX = /(?:dm\s+me\s+on\s+(?:the\s+)?(?:other|another)\s+app|message\s+me\s+(?:directly|privately|outside)|find\s+me\s+(?:on|at)\s+(?:the\s+)?(?:other|another))/gi

// T&S-1: Verbal off-platform solicitation patterns
// Matches phrases like "message me on WhatsApp", "find me on Instagram", "book directly with me", etc.
const VERBAL_BYPASS_REGEX = /(?:(?:message|msg|contact|reach\s+(?:me\s+)?out|find|dm)\s+(?:me|us)\s+(?:on|via|at|through|over)\s+\w+|text\s+me\s+directly|book\s+(?:me\s+)?directly\s+(?:with\s+me)?|my\s+(?:personal\s+)?(?:link|page|profile|site|website))/gi

export function filterContactInfoLax(text: string): FilterResult {
  // For address fields — skips ADDRESS_REGEX and POSTCODE_REGEX to avoid false positives
  // on legitimate street addresses. Only checks phones, emails, social handles, off-platform language.
  return filterContactInfo(text, { skipAddressRegex: true })
}

export function filterContactInfo(input: string, options?: { skipAddressRegex?: boolean }): FilterResult {
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

  // Check TikTok handles/links
  const tiktoks = input.match(TIKTOK_REGEX)
  if (tiktoks) {
    matches.push(...tiktoks)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(TIKTOK_REGEX, '[contact info hidden]')
  }

  // Check Telegram handles/links
  const telegrams = input.match(TELEGRAM_REGEX)
  if (telegrams) {
    matches.push(...telegrams)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(TELEGRAM_REGEX, '[contact info hidden]')
  }

  // Check URLs
  const urls = input.match(URL_REGEX)
  if (urls) {
    matches.push(...urls)
    flagType = flagType ? 'MULTIPLE' : 'URL'
    text = text.replace(URL_REGEX, '[contact info hidden]')
  }

  // Check street addresses (skip for address fields to avoid false positives)
  if (!options?.skipAddressRegex) {
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

  // Check bare platform prefix patterns (e.g. "ig: goldnails", "insta: goldnails_sydney")
  const platformPrefixes = text.match(PLATFORM_PREFIX_REGEX)
  if (platformPrefixes) {
    matches.push(...platformPrefixes)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(PLATFORM_PREFIX_REGEX, '[contact info hidden]')
  }

  // Check "my [platform] is [handle]" patterns
  const myPlatforms = text.match(MY_PLATFORM_REGEX)
  if (myPlatforms) {
    matches.push(...myPlatforms)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(MY_PLATFORM_REGEX, '[contact info hidden]')
  }

  // Check off-platform bypass attempts
  const bypasses = input.match(BYPASS_REGEX)
  if (bypasses) {
    matches.push(...bypasses)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(BYPASS_REGEX, '[contact info hidden]')
  }

  // P2-8: Check WhatsApp direct links
  const whatsapps = input.match(WHATSAPP_REGEX)
  if (whatsapps) {
    matches.push(...whatsapps)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(WHATSAPP_REGEX, '[contact info hidden]')
  }

  // P2-8: Check QR code solicitation
  const qrSolicitations = input.match(QR_SOLICITATION_REGEX)
  if (qrSolicitations) {
    matches.push(...qrSolicitations)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(QR_SOLICITATION_REGEX, '[contact info hidden]')
  }

  // P2-8: Check coded off-platform language
  const offPlatformAttempts = input.match(OFF_PLATFORM_REGEX)
  if (offPlatformAttempts) {
    matches.push(...offPlatformAttempts)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(OFF_PLATFORM_REGEX, '[contact info hidden]')
  }

  // T&S-1: Check verbal off-platform bypass phrases
  const verbalBypasses = input.match(VERBAL_BYPASS_REGEX)
  if (verbalBypasses) {
    matches.push(...verbalBypasses)
    flagType = flagType ? 'MULTIPLE' : 'SOCIAL'
    text = text.replace(VERBAL_BYPASS_REGEX, '[contact info hidden]')
  }

  return {
    text,
    flagged: matches.length > 0,
    flagType,
    matches,
  }
}
