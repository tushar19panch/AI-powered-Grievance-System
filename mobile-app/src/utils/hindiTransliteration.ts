// Utility for English to Hindi phonetic transliteration and common dictionary mapping

const EXACT_MAP: Record<string, string> = {
  // Villages & Administrative
  'phulera': 'फुलेरा',
  'gram panchayat phulera': 'ग्राम पंचायत फुलेरा',
  'rampur': 'रामपुर',
  'bilaspur': 'बिलासपुर',
  'gopalpur': 'गोपालपुर',
  'shivpur': 'शिवपुर',
  'chandpur': 'चांदपुर',
  'kalyanpur': 'कल्याणपुर',
  'sundarpur': 'सुंदरपुर',
  'govindpur': 'गोविंदपुर',
  'sitapur': 'सीतापुर',
  'fatehpur': 'फतेहपुर',
  'anandpur': 'आनंदपुर',
  'daulatpur': 'दौलतपुर',
  'main village': 'मुख्य ग्राम',
  'gram panchayat': 'ग्राम पंचायत',
  'panchayat': 'ग्राम पंचायत',
  'village': 'गाँव',

  // Common Names & Roles
  'aditya': 'आदित्य',
  'aditya kumar': 'आदित्य कुमार',
  'aditya sharma': 'आदित्य शर्मा',
  'aditya singh': 'आदित्य सिंह',
  'rahul': 'राहुल',
  'rahul sharma': 'राहुल शर्मा',
  'rahul verma': 'राहुल वर्मा',
  'amit': 'अमित',
  'amit kumar': 'अमित कुमार',
  'ramesh': 'रमेश',
  'ramesh kumar': 'रमेश कुमार',
  'suresh': 'सुरेश',
  'suresh verma': 'सुरेश वर्मा',
  'vikram': 'विक्रम',
  'vikas': 'विकास',
  'pooja': 'पूजा',
  'priya': 'प्रिया',
  'tushar': 'तुषार',
  'rohit': 'रोहित',
  'manoj': 'मनोज',
  'neha': 'नेहा',
  'anil': 'अनिल',
  'sunil': 'सुनील',
  'vijay': 'विजय',
  'ajay': 'अजय',
  'sanjay': 'संजय',
  'deepak': 'दीपक',
  'rajesh': 'राजेश',
  'mahesh': 'महेश',
  'dinesh': 'दिनेश',
  'kamal': 'कमल',
  'pawan': 'पवन',
  'sachin': 'सचिन',
  'varun': 'वरुण',
  'alok': 'आलोक',
  'manish': 'मनीष',
  'pradeep': 'प्रदीप',
  'praveen': 'प्रवीण',
  'sandip': 'संदीप',
  'sandeep': 'संदीप',
  'mukesh': 'मुकेश',
  'ashok': 'अशोक',
  'vinod': 'विनोद',
  'rakesh': 'राकेश',
  'jitendra': 'जितेंद्र',
  'dharmendra': 'धर्मेंद्र',
  'brijesh': 'बृजेश',
  'santosh': 'संतोष',
  'anand': 'आनंद',
  'mohan': 'मोहन',
  'sohan': 'सोहन',
  'rohan': 'रोहन',
  'govind': 'गोविंद',
  'gopal': 'गोपाल',
  'krishna': 'कृष्णा',
  'radha': 'राधा',
  'seema': 'सीमा',
  'geeta': 'गीता',
  'sunita': 'सुनीता',
  'anita': 'अनिता',
  'kavita': 'कविता',
  'rekha': 'रेखा',
  'sarita': 'सरिता',
  'shanti': 'शांति',
  'laxmi': 'लक्ष्मी',
  'sarpanch': 'सरपंच जी',
  'secretary': 'ग्राम सचिव जी',
  'citizen': 'नागरिक',
  'admin': 'सरपंच / एडमिन',
  'resident': 'ग्रामीण',
  'user': 'उपयोगकर्ता',
};

// Check if string contains Devanagari characters
export function isDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

// English to Hindi phonetic transliterator
export function transliterateEnglishToHindi(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (isDevanagari(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (EXACT_MAP[lower]) {
    return EXACT_MAP[lower];
  }

  // Multi-word phrase lookup
  const words = trimmed.split(/\s+/);
  const translatedWords = words.map((w) => {
    const wLower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (EXACT_MAP[wLower]) return EXACT_MAP[wLower];
    return transliterateWord(w);
  });

  return translatedWords.join(' ');
}

function transliterateWord(word: string): string {
  const w = word.toLowerCase();
  if (EXACT_MAP[w]) return EXACT_MAP[w];

  // Phonetic rule mappings
  const rules: [RegExp, string][] = [
    [/^shree|^shri/, 'श्री'],
    [/^aa/, 'आ'],
    [/^ai/, 'ऐ'],
    [/^au/, 'औ'],
    [/^a/, 'अ'],
    [/^ee|^i/, 'ई'],
    [/^oo|^u/, 'ऊ'],
    [/^o/, 'ओ'],
    [/^e/, 'ए'],
    [/ksh/g, 'क्ष'],
    [/gya|jnya/g, 'ज्ञ'],
    [/tra/g, 'त्र'],
    [/shr/g, 'श्र'],
    [/ch/g, 'च'],
    [/chh/g, 'छ'],
    [/sh/g, 'श'],
    [/kh/g, 'ख'],
    [/gh/g, 'घ'],
    [/th/g, 'थ'],
    [/dh/g, 'ध'],
    [/ph|f/g, 'फ'],
    [/bh/g, 'भ'],
    [/jh/g, 'झ'],
    [/k/g, 'क'],
    [/g/g, 'ग'],
    [/j/g, 'ज'],
    [/t/g, 'त'],
    [/d/g, 'द'],
    [/n/g, 'न'],
    [/p/g, 'प'],
    [/b/g, 'ब'],
    [/m/g, 'म'],
    [/y/g, 'य'],
    [/r/g, 'र'],
    [/l/g, 'ल'],
    [/v|w/g, 'व'],
    [/s/g, 'स'],
    [/h/g, 'ह'],
    [/z/g, 'ज़'],
    [/q/g, 'क'],
    [/x/g, 'क्स'],
  ];

  // Simple phonetic builder
  let result = '';
  let i = 0;
  const len = w.length;

  while (i < len) {
    let matched = false;

    // Check 4-letter combos
    const sub4 = w.substring(i, i + 4);
    if (sub4 === 'gram') {
      result += 'ग्राम';
      i += 4;
      continue;
    }

    // Check 3-letter combos
    const sub3 = w.substring(i, i + 3);
    if (sub3 === 'pur') {
      result += 'पुर';
      i += 3;
      continue;
    }
    if (sub3 === 'gar') {
      result += 'गढ़';
      i += 3;
      continue;
    }

    // Two-letter combos
    const sub2 = w.substring(i, i + 2);
    if (sub2 === 'sh') { result += 'श'; i += 2; continue; }
    if (sub2 === 'ch') { result += 'च'; i += 2; continue; }
    if (sub2 === 'th') { result += 'थ'; i += 2; continue; }
    if (sub2 === 'dh') { result += 'ध'; i += 2; continue; }
    if (sub2 === 'kh') { result += 'ख'; i += 2; continue; }
    if (sub2 === 'gh') { result += 'घ'; i += 2; continue; }
    if (sub2 === 'bh') { result += 'भ'; i += 2; continue; }
    if (sub2 === 'ph') { result += 'फ'; i += 2; continue; }
    if (sub2 === 'jh') { result += 'झ'; i += 2; continue; }
    if (sub2 === 'aa') { result += result ? 'ा' : 'आ'; i += 2; continue; }
    if (sub2 === 'ee') { result += result ? 'ी' : 'ई'; i += 2; continue; }
    if (sub2 === 'oo') { result += result ? 'ू' : 'ऊ'; i += 2; continue; }
    if (sub2 === 'ai') { result += result ? 'ै' : 'ऐ'; i += 2; continue; }
    if (sub2 === 'au') { result += result ? 'ौ' : 'औ'; i += 2; continue; }

    const c = w[i];
    if (c === 'a') {
      if (i > 0 && i === len - 1) {
        result += 'ा';
      } else if (i === 0) {
        result += 'अ';
      }
      i++;
      continue;
    }
    if (c === 'i') { result += result ? 'ि' : 'इ'; i++; continue; }
    if (c === 'u') { result += result ? 'ु' : 'उ'; i++; continue; }
    if (c === 'e') { result += result ? 'े' : 'ए'; i++; continue; }
    if (c === 'o') { result += result ? 'ो' : 'ओ'; i++; continue; }
    if (c === 'k') { result += 'क'; i++; continue; }
    if (c === 'g') { result += 'ग'; i++; continue; }
    if (c === 'j') { result += 'ज'; i++; continue; }
    if (c === 't') { result += 'त'; i++; continue; }
    if (c === 'd') { result += 'द'; i++; continue; }
    if (c === 'n') { result += 'न'; i++; continue; }
    if (c === 'p') { result += 'प'; i++; continue; }
    if (c === 'b') { result += 'ब'; i++; continue; }
    if (c === 'm') { result += 'म'; i++; continue; }
    if (c === 'y') { result += 'य'; i++; continue; }
    if (c === 'r') { result += 'र'; i++; continue; }
    if (c === 'l') { result += 'ल'; i++; continue; }
    if (c === 'v' || c === 'w') { result += 'व'; i++; continue; }
    if (c === 's') { result += 'स'; i++; continue; }
    if (c === 'h') { result += 'ह'; i++; continue; }

    result += c;
    i++;
  }

  return result || word;
}

export function localizeName(name: string | undefined | null, isHindi: boolean): string {
  if (!name) return isHindi ? 'नागरिक' : 'Citizen';
  if (!isHindi) return name;
  return transliterateEnglishToHindi(name);
}

export function localizeVillageName(village: string | undefined | null, isHindi: boolean): string {
  if (!village) return isHindi ? 'मुख्य ग्राम पंचायत' : 'Gram Panchayat';
  if (!isHindi) return village;
  return transliterateEnglishToHindi(village);
}
