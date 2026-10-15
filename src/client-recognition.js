/* Client data recognised from pasted text — one rule set for every contract
   (01/03 pdf.html, 02 umowa-sprzedazy.html). The owner's rules
   (docs/PROJECT-UMOWY.md §6), whatever order or labels the text comes in:

   - PESEL: 11 digits.  NIP: 10 digits.
   - Phone: Polish numbers as 9 digits, without +48 / 0048.
   - Address: "ul. Kolejowa 102, 05-092 Łomianki" — street with number, comma,
     postal code and city. The line with the postal code and city anchors it:
     everything else on that line belongs to the address, the street may also
     be on the line above or below.
   - Name: exactly two words, "Imię Nazwisko", even when the text gives the
     surname first, in capitals, with a middle name or with separate labels.

   Loads in the browser (window.AutogoodClientRecognition) and in Node (tests). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AutogoodClientRecognition = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function fold(value) {
    return String(value || "")
      .replace(/ł/g, "l")
      .replace(/Ł/g, "L")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  // First names: Polish, plus the Belarusian / Ukrainian / Russian ones in the
  // spellings their passports use (export clients). Used only to tell the
  // first name from the surname.
  const FIRST_NAMES = new Set(
    `adam adrian albert alan aleksander alfred ambrozy andrzej antoni arkadiusz arnold artur bartlomiej bartosz benedykt bernard blazej bogdan boguslaw boleslaw borys bronislaw cezary czeslaw damian daniel dariusz dawid dominik edward edmund emil eryk eugeniusz fabian feliks filip franciszek fryderyk gabriel gerard grzegorz gustaw henryk hieronim hubert ignacy igor ireneusz jacek jakub jan janusz jaroslaw jerzy jozef julian juliusz kacper kajetan kamil karol kazimierz konrad konstanty kornel krystian krzysztof ksawery leon leonard leszek lucjan ludwik lukasz maciej maksymilian marcel marcin marek marian mariusz mateusz maurycy michal mieczyslaw mikolaj milosz miroslaw natan nikodem norbert olaf oliwer oskar patryk pawel piotr przemyslaw radoslaw rafal remigiusz robert roman ryszard sebastian seweryn slawomir stanislaw stefan szczepan szymon tadeusz teodor tobiasz tomasz tymon tymoteusz wactaw waclaw waldemar wieslaw wiktor wincenty witold wladyslaw wlodzimierz wojciech zbigniew zdzislaw zenon zygmunt
     ada adela adrianna agata agnieszka aleksandra alicja alina amelia anastazja aneta angelika anna antonina barbara beata bogumila bozena celina danuta daria dominika dorota edyta elwira elzbieta emilia ewa ewelina felicja gabriela genowefa grazyna halina hanna helena ilona irena iwona izabela jadwiga jagoda janina joanna jolanta julia julianna justyna kamila karina karolina katarzyna kazimiera kinga klaudia kornelia krystyna laura lena lidia liliana lucyna magdalena maja malgorzata maria marianna mariola marta martyna marzena michalina milena miroslawa monika natalia nikola nina oliwia patrycja paulina regina renata roksana roza sabina sandra sara stanislawa stefania sylwia teresa urszula wanda weronika wiesława wieslawa wiktoria wioletta zofia zuzanna zaneta
     aliaksandr aliaksei aleksandr aleksiej aleksey alexander alexey alexei anatoli anatolii andrei andrej andriej andrii andriy anton arseni arsenii artem artiom artsiom bohdan danila danylo denis denys dmitri dmitrij dmitry dmytro dzmitry evgeni evgeny eugene fedor fiodar gennadi gleb hennadii hleb ihar ilia ilya ivan iwan jauhen jewgienij jurij kanstantsin kiryl kirill konstantin leanid leonid maksim maksym maxim matvei mikalai mikhail mikita mykhailo mykola nazar nikita nikolai nikolay oleg oleh oleksandr oleksii pavel pavlo petro raman rostyslav ruslan sergei sergey sergiu serhii serhiy siarhei siergiej stanislau stanislav taras timur uladzimir vadim vadym valentin valentyn valerii valery vasili vasyl viktar viktor vitali vitalii vitaliy vladimir vladislav vladyslav volodymyr wladimir yan yaroslav yauheni yevhen yuri yurii yury zakhar
     alena alesia alesya aliona alla anastasia anastasiia anastasiya darina darya diana ekaterina elena evgenia halina inna irina iryna kateryna katerina katsiaryna khrystyna kristina krystsina ksenia kseniia kseniya larisa larysa lilia liliia liudmila liudmyla lyudmila maryia mariia mariya marina maryna nadezhda nadiia nadzeya nastassia natallia natalya oksana olena olga olha palina polina sofia sofiia snezhana svetlana sviatlana svitlana tatiana tatsiana tatyana tetiana uliana valeria valeryia valentina veranika vera veronika viera viktoria viktoriia viktoryia volha yana yelena yevheniia yulia yuliia yuliya zhanna
     michael john david thomas peter paul mark andreas markus christian sarah lisa`
      .split(/\s+/)
      .filter(Boolean)
  );

  const SURNAME_ENDING = /(?:ski|ska|cki|cka|dzki|dzka|wicz|owicz|ewicz|czyk|czak|szyk|niak|ak|ek|uk|yk|ik|enko|ko|ow|ew|ov|ova|ev|eva|in|ina|ich|icz|owa|ewa|ówna|uch|ec|iec|ga)$/;

  const CAR_MAKES = new Set(
    "audi bmw mercedes mercedes-benz volkswagen vw toyota skoda ford opel kia hyundai volvo renault peugeot citroen fiat mazda nissan honda lexus porsche tesla seat cupra dacia jeep land rover mini suzuki subaru mitsubishi alfa romeo jaguar chevrolet chrysler dodge infiniti genesis ds smart saab lancia".split(" ")
  );

  const COMPANY_SIGNAL = /(?:\bsp\.?\s*z\s*o\.?\s*o\.?|\bspółka\b|\bspolka\b|\bs\.\s?a\.|\bsp\.\s?j\.|\bsp\.\s?k\.|\bs\.\s?c\.|\bp\.?\s?h\.?\s?u\.?\b|\bf\.?\s?h\.?\s?u\.?\b|\bpphu\b|\bfirma\b|\bjdg\b|\bgmbh\b|\bltd\b|\bllc\b|\bsrl\b)/i;

  /* Labels. A label counts when it is followed by ":" — or, for the ones
     whose value is self-evident (PESEL 85…, tel. +48…, e-mail x@y, paszport
     AB…), by a space and that value. Longest first, so "Adres e-mail" is an
     e-mail and "Nazwisko i imię" is not two labels. */
  const LABELS = [
    ["nameReversed", ["nazwisko i imię", "nazwisko i imie", "nazwisko, imię", "nazwisko, imie"]],
    ["name", ["imię i nazwisko / nazwa", "imię i nazwisko/nazwa", "imię i nazwisko", "imie i nazwisko", "klient", "zleceniodawca", "kupujący", "kupujacy", "nabywca", "nazwa firmy", "nazwa", "firma"]],
    ["firstName", ["imię", "imie", "imiona"]],
    ["lastName", ["nazwisko"]],
    ["email", ["adres e-mail", "adres email", "e-mail", "email", "e-mail do akceptacji i korespondencji", "mail"], ["adres e-mail", "adres email", "e-mail", "email", "mail"]],
    ["address", ["adres zamieszkania", "adres zameldowania", "adres do korespondencji", "adres siedziby", "miejsce zamieszkania", "siedziba", "adres", "zamieszkały", "zamieszkała", "zam."], ["zamieszkały", "zamieszkała", "zam."]],
    ["pesel", ["pesel", "nr pesel"], ["pesel", "nr pesel"]],
    ["nip", ["nip", "nr nip"], ["nip", "nr nip"]],
    ["phone", ["numer telefonu", "nr telefonu", "nr. tel.", "nr tel.", "nr tel", "tel. kom.", "telefon", "tel.", "tel", "kom.", "komórka", "phone", "телефон", "тел."], ["numer telefonu", "nr telefonu", "nr. tel.", "nr tel.", "nr tel", "tel. kom.", "telefon", "tel.", "tel", "kom.", "komórka", "phone", "телефон", "тел."]],
    ["document", ["rodzaj, numer i seria dokumentu tożsamości", "dokument tożsamości", "dowód osobisty", "dowod osobisty", "nr dowodu", "seria i numer", "dowód", "dowod", "paszport", "karta pobytu", "dokument", "do"], ["dowód osobisty", "dowod osobisty", "paszport", "karta pobytu", "nr dowodu"]],
    ["other", ["auto", "pojazd", "samochód", "samochod", "marka i model", "marka", "model", "vin", "budżet", "budzet", "zaliczka", "cena", "przebieg", "rok", "rocznik", "paliwo", "skrzynia", "nadwozie", "rabat", "kwota", "uwagi", "nr konta", "konto", "bank", "regon", "krs", "wyposażenie", "dodatkowe"]],
  ];

  const labelIndex = [];
  for (const [kind, names, bare = []] of LABELS) {
    for (const name of names) labelIndex.push({ kind, name, bare: bare.includes(name) });
  }
  labelIndex.sort((a, b) => b.name.length - a.name.length);

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  const LABEL_PATTERN = new RegExp(
    `(?<![\\p{L}\\d])(${labelIndex.map((label) => escapeRegExp(label.name)).join("|")})(?![\\p{L}])`,
    "giu"
  );

  function labelAt(line, match) {
    const name = match[1].toLowerCase();
    const entry = labelIndex.find((label) => label.name === name);
    if (!entry) return null;
    const rest = line.slice(match.index + match[0].length);
    if (/^\s*[:=]/.test(rest)) return entry;
    if (!entry.bare) return null;
    if (entry.kind === "email") return /^\s+\S+@/.test(rest) ? entry : null;
    if (entry.kind === "document") return /^\s+[A-Z0-9]/i.test(rest) ? entry : null;
    if (entry.kind === "address") return /^\s+\S/.test(rest) ? entry : null;
    return /^\s*\.?\s*[+(\d]/.test(rest) ? entry : null;
  }

  function cleanValue(value) {
    return String(value || "")
      .replace(/^[\s:=,;|–-]+/, "")
      .replace(/[\s,;|–-]+$/, "")
      .trim();
  }

  // Each line is cut at its labels: [{ kind, value, line }]. Text before the
  // first label on a line is a segment of kind "free".
  function segmentize(text) {
    const segments = [];
    String(text || "")
      .replace(/ /g, " ")
      .replace(/[–—]/g, "-")
      .split(/\r?\n/)
      .forEach((rawLine, lineIndex) => {
        const line = rawLine.replace(/[ \t]+/g, " ").trim();
        if (!line) return;
        const cuts = [];
        for (const match of line.matchAll(LABEL_PATTERN)) {
          const entry = labelAt(line, match);
          if (entry) cuts.push({ entry, start: match.index, end: match.index + match[0].length });
        }
        let cursor = 0;
        let kind = "free";
        for (const cut of cuts) {
          const value = cleanValue(line.slice(cursor, cut.start));
          if (value || kind !== "free") segments.push({ kind, value, line: lineIndex });
          kind = cut.entry.kind;
          cursor = cut.end;
        }
        const value = cleanValue(line.slice(cursor));
        if (value || kind !== "free") segments.push({ kind, value, line: lineIndex });
      });
    return segments.flatMap(splitTrailing);
  }

  // "PESEL 85010112345, Kolejowa 102, 05-092 Łomianki": a number or e-mail
  // label takes only its value; the rest of the line is free text again.
  function splitTrailing(segment) {
    const head =
      segment.kind === "email"
        ? segment.value.match(/^\S*@\S*?(?=[,;]|\s|$)/)
        : ["pesel", "nip", "phone"].includes(segment.kind)
          ? segment.value.match(/^(?:PL)?[\d\s+().\/-]*\d\)?/i)
          : null;
    if (!head) return [segment];
    const rest = cleanValue(segment.value.slice(head[0].length));
    if (!/\p{L}/u.test(rest)) return [segment];
    return [{ ...segment, value: cleanValue(head[0]) }, { kind: "free", value: rest, line: segment.line }];
  }

  /* --- numbers -------------------------------------------------------------- */

  function peselChecksumValid(digits) {
    if (!/^\d{11}$/.test(digits)) return false;
    const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    const sum = weights.reduce((total, weight, index) => total + weight * Number(digits[index]), 0);
    return (10 - (sum % 10)) % 10 === Number(digits[10]);
  }

  // A run of number-like tokens ("+48", "601-234-567", "22 456 78 90") split
  // into the numbers it holds: PESEL 11, NIP 10, phone 9 (or +48 + 9).
  function classifyGroup(raw) {
    // "+48", "0048", "(+48)", "(0048)" all mark an international prefix.
    const plus = /^\s*\(?\s*(?:\+|00)/.test(raw);
    let digits = raw.replace(/\D/g, "");
    if (/^00/.test(digits) && plus) digits = digits.slice(2);
    if (plus) {
      if (digits.startsWith("48") && digits.length === 11) return { kind: "phone", value: digits.slice(2) };
      if (digits.length >= 10 && digits.length <= 13 && !digits.startsWith("48")) return { kind: "phone", value: `+${digits}` };
      return null;
    }
    if (digits.length === 9) return { kind: "phone", value: digits };
    if (digits.length === 10) return { kind: "nip", value: digits };
    if (digits.length === 11) {
      // "48601234567" is a phone written without "+" unless it is a valid PESEL.
      if (digits.startsWith("48") && !peselChecksumValid(digits)) return { kind: "phone", value: digits.slice(2) };
      return { kind: "pesel", value: digits };
    }
    return null;
  }

  function numbersIn(value) {
    const tokens = String(value || "")
      .replace(/\bPL(?=\d{10}\b)/gi, "")
      .split(/\s+/)
      .map((token) => token.replace(/[,;.]+$/, ""));
    const runs = [];
    let run = [];
    for (const token of tokens) {
      const numeric = /^(?:\+|00)?\(?\+?\d[\d().-]*$/.test(token) && !/^\d{2}-\d{3}$/.test(token);
      if (numeric) run.push(token);
      else if (run.length) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length) runs.push(run);

    const found = [];
    for (const parts of runs) {
      let index = 0;
      while (index < parts.length) {
        let taken = null;
        for (let end = parts.length; end > index; end -= 1) {
          const group = classifyGroup(parts.slice(index, end).join(" "));
          if (group) {
            taken = { group, end };
            break;
          }
        }
        if (taken) {
          found.push(taken.group);
          index = taken.end;
        } else {
          index += 1;
        }
      }
    }
    return found;
  }

  /* --- address -------------------------------------------------------------- */

  const STREET_PREFIX = /^(ul\.?|ulica|al\.?|aleja|aleje|pl\.?|plac|os\.?|osiedle|rondo|skwer|bulwar)(?=\s|$)\s*/i;
  const POSTAL = /(?<!\d)(\d{2})\s?-\s?(\d{3})(?!\d)/;
  const ROMAN = /^(?=[IVXLC]+$)M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/;

  function capitalizeWord(word) {
    if (ROMAN.test(word)) return word;
    if (word !== word.toLowerCase() && word !== word.toUpperCase()) return word;
    return word
      .toLowerCase()
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-");
  }

  function titlePlace(value) {
    const small = new Set(["i", "w", "z", "nad", "pod", "na", "przy", "im.", "św."]);
    return value
      .split(" ")
      .map((word, index) => (index && small.has(word.toLowerCase()) ? word.toLowerCase() : /^\p{L}/u.test(word) ? capitalizeWord(word) : word))
      .join(" ");
  }

  function normalizeStreet(raw, city) {
    let street = cleanValue(raw)
      .replace(/\s+/g, " ")
      .replace(/(\d+[A-Za-z]?)\s*\/\s*(\d+[A-Za-z]?)/g, "$1/$2")
      .replace(/(\d+[A-Za-z]?)\s*,?\s*(?:m\.?|lok\.?|lokal|mieszk\.?)\s*(\d+[A-Za-z]?)\b/gi, "$1/$2");
    const prefix = street.match(STREET_PREFIX);
    let rest = prefix ? street.slice(prefix[0].length) : street;
    rest = titlePlace(rest);
    if (prefix) {
      const word = prefix[1].replace(/\.$/, "").toLowerCase();
      const short = { ul: "ul.", ulica: "ul.", al: "al.", pl: "pl.", os: "os." }[word];
      return `${short || capitalizeWord(prefix[1])} ${rest}`.trim();
    }
    // A village address has the place name instead of a street: "Zielonki 12".
    const name = rest.replace(/\s*\d.*$/, "").trim();
    if (city && fold(name) === fold(city)) return rest;
    return `ul. ${rest}`;
  }

  function looksLikeStreet(value) {
    if (!value || /@/.test(value) || POSTAL.test(value)) return false;
    if (STREET_PREFIX.test(value)) return true;
    const digits = value.replace(/\D/g, "");
    return /\p{L}{2,}/u.test(value) && /\p{L}[\p{L}.'-]*\.?\s+\d{1,4}[A-Za-z]?(?:\s*[/-]\s*\d{1,4}[A-Za-z]?|\s*(?:m\.?|lok\.?)\s*\d+)?\b/u.test(value) && digits.length <= 8;
  }

  const CITY_WORD = "[\\p{L}][\\p{L}'.]*(?:-[\\p{L}][\\p{L}'.]*)*";

  // "…, 05-092 Łomianki", "05-092 Łomianki, ul. …", "Łomianki 05-092 ul. …"
  function splitPostalLine(value) {
    const match = value.match(POSTAL);
    if (!match) return null;
    const postal = `${match[1]}-${match[2]}`;
    const before = value.slice(0, match.index);
    const after = value.slice(match.index + match[0].length);

    let city = "";
    let rest = [before];
    const afterCity = after.match(new RegExp(`^\\s*,?\\s*(${CITY_WORD}(?:\\s+${CITY_WORD})*)`, "u"));
    if (afterCity) {
      const words = afterCity[1].split(/\s+/);
      const prefixAt = words.findIndex((word) => STREET_PREFIX.test(word));
      const cityWords = prefixAt >= 0 ? words.slice(0, prefixAt) : words;
      const following = after.slice(afterCity[0].length);
      // Words followed by a house number are a street, not the city.
      const isStreet = prefixAt < 0 && /^\s*\d/.test(following);
      if (cityWords.length && !isStreet) {
        city = cityWords.join(" ");
        const consumed = after.indexOf(city) + city.length;
        rest.push(after.slice(consumed));
      } else {
        rest.push(after);
      }
    } else {
      rest.push(after);
    }
    if (!city) {
      const lastChunk = before.split(",").pop();
      const beforeCity = lastChunk.match(new RegExp(`(${CITY_WORD}(?:\\s+${CITY_WORD})*)\\s*$`, "u"));
      if (beforeCity && !/\d/.test(beforeCity[1]) && !STREET_PREFIX.test(beforeCity[1])) {
        const tail = beforeCity[1].split(/\s+/);
        // Keep only the words after the last token with a digit (the house number).
        city = tail.join(" ");
        rest[0] = before.slice(0, before.length - lastChunk.length) + lastChunk.slice(0, lastChunk.length - beforeCity[0].length);
      }
    }
    // Of the comma pieces around the postal code only the street, its number
    // and the flat stay: a name or "Polska" on the same line is not the address.
    const street = rest
      .flatMap((part) => part.split(/[,;]/))
      .map(cleanValue)
      .filter((piece) => piece && (looksLikeStreet(piece) || STREET_PREFIX.test(piece) || /^(?:m\.?|lok\.?|lokal|mieszk\.?)?\s*\d{1,4}[A-Za-z]?(?:\s*\/\s*\d{1,4}[A-Za-z]?)?$/i.test(piece)))
      .join(" ");
    return { postal, city: titlePlace(city), street };
  }

  function recognizeAddress(segments, usedName) {
    const pool = segments.filter((segment) => segment.kind === "address" || segment.kind === "free");
    const anchorIndex = (() => {
      const labelled = pool.findIndex((segment) => segment.kind === "address" && POSTAL.test(segment.value));
      if (labelled >= 0) return labelled;
      return pool.findIndex((segment) => POSTAL.test(segment.value) && !/@/.test(segment.value));
    })();

    if (anchorIndex >= 0) {
      const anchor = pool[anchorIndex];
      const parts = splitPostalLine(anchor.value);
      let street = parts.street;
      if (!street || !/\p{L}/u.test(street)) {
        const neighbours = [pool[anchorIndex - 1], pool[anchorIndex + 1]].filter(
          (segment) => segment && Math.abs(segment.line - anchor.line) === 1 && segment.value !== usedName && looksLikeStreet(segment.value)
        );
        street = neighbours[0]?.value || "";
      }
      const city = parts.city;
      const place = [parts.postal, city].filter(Boolean).join(" ");
      return street ? `${normalizeStreet(street, city)}, ${place}` : place;
    }

    // No postal code: a labelled address, or a street-looking line.
    const labelled = pool.find((segment) => segment.kind === "address" && segment.value);
    const line = labelled || pool.find((segment) => segment.kind === "free" && looksLikeStreet(segment.value) && segment.value !== usedName);
    if (!line) return "";
    const pieces = line.value.split(",").map(cleanValue).filter(Boolean);
    const streetPiece = pieces.find(looksLikeStreet);
    const others = pieces.filter((piece) => piece !== streetPiece).map(titlePlace);
    return [streetPiece ? normalizeStreet(streetPiece, others[0]) : "", ...others].filter(Boolean).join(", ");
  }

  /* --- name ----------------------------------------------------------------- */

  function isFirstName(word) {
    return FIRST_NAMES.has(fold(word));
  }

  function surnameLike(word) {
    return SURNAME_ENDING.test(fold(word).replace(/-.*$/, "")) || word.includes("-");
  }

  // Any order, any case, middle names → "Imię Nazwisko".
  function twoWordName(raw, { reversed = false } = {}) {
    // "Pan", "Pani", titles: not part of the name.
    const honorific = /^(?:pan|pani|panna|państwo|panstwo|p\.|sz\.?p\.?|mr\.?|mrs\.?|ms\.?|dr\.?|mgr\.?|inż\.?|inz\.?|prof\.?)$/i;
    const words = cleanValue(raw)
      .replace(/[,;]/g, " ")
      .split(/\s+/)
      .filter((word) => /\p{L}/u.test(word) && !honorific.test(word));
    if (!words.length) return "";
    const capsSurname = words.findIndex((word) => word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase());
    const mixedCase = words.some((word) => word !== word.toUpperCase());
    const ordered = reversed ? [...words.slice(1), words[0]] : words;
    const titled = ordered.map(capitalizeWord);
    if (titled.length === 1) return titled[0];

    const firstIndex = titled.findIndex(isFirstName);
    let first;
    let surnames;
    if (firstIndex >= 0) {
      first = titled[firstIndex];
      const others = titled.filter((word, index) => index !== firstIndex);
      // Another first name next to the surname is a middle name: dropped.
      const notNames = others.filter((word) => !isFirstName(word));
      surnames = notNames.length ? notNames : others.slice(-1);
    } else if (!reversed && mixedCase && capsSurname >= 0) {
      // "KOWALSKA Anna": the word in capitals is the surname.
      first = titled.find((word, index) => index !== capsSurname);
      surnames = [titled[capsSurname]];
    } else if (!reversed && surnameLike(titled[0]) && !surnameLike(titled[titled.length - 1])) {
      first = titled[titled.length - 1];
      surnames = titled.slice(0, -1);
    } else {
      first = titled[0];
      surnames = titled.slice(1);
    }
    if (!surnames.length) return first;
    // Two surnames without a hyphen are one double surname.
    return `${first} ${surnames.join("-")}`;
  }

  function nameCandidate(segment, index) {
    const value = segment.value;
    if (!value || /[\d@]/.test(value) || STREET_PREFIX.test(value)) return null;
    const words = value.split(/\s+/);
    if (words.length < 2 || words.length > 4) return null;
    if (!words.every((word) => /^[\p{L}][\p{L}'.-]*,?$/u.test(word))) return null;
    if (CAR_MAKES.has(fold(words[0]))) return null;
    const score = (words.some(isFirstName) ? 2 : 0) + (index === 0 ? 1 : 0);
    return score ? { value, score } : null;
  }

  // A whole free line, or — in "Anna Kowalska, Kolejowa 102, 05-092 Łomianki"
  // — one of its comma pieces.
  function nameCandidates(segment, index) {
    const whole = nameCandidate(segment, index);
    if (whole || !/[,;]/.test(segment.value)) return whole ? [whole] : [];
    return segment.value
      .split(/[,;]/)
      .map((piece, pieceIndex) => nameCandidate({ value: cleanValue(piece) }, index + pieceIndex))
      .filter(Boolean);
  }

  /* --- main ----------------------------------------------------------------- */

  function recognizeClient(text) {
    const segments = segmentize(text);
    const all = segments.map((segment) => segment.value).join("\n");

    // E-mail
    const emailPattern = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i;
    const email = (segments.find((segment) => segment.kind === "email" && emailPattern.test(segment.value))?.value.match(emailPattern) || all.match(emailPattern) || [""])[0];

    // Numbers: labelled first, then free text by number of digits.
    const numbersOf = (kind) => segments.filter((segment) => segment.kind === kind).flatMap((segment) => numbersIn(segment.value));
    const freeNumbers = segments.filter((segment) => ["free", "name"].includes(segment.kind)).flatMap((segment) => numbersIn(segment.value));
    const labelledPhone = segments
      .filter((segment) => segment.kind === "phone")
      .map((segment) => {
        const found = numbersIn(segment.value).find((number) => number.kind === "phone");
        return found ? found.value : "";
      })
      .find(Boolean);
    const labelledPesel = segments.filter((segment) => segment.kind === "pesel").map((segment) => segment.value.replace(/\D/g, "")).find((digits) => digits.length === 11);
    const labelledNip = segments.filter((segment) => segment.kind === "nip").map((segment) => segment.value.replace(/^PL/i, "").replace(/\D/g, "")).find((digits) => digits.length === 10);
    const pesel = labelledPesel || freeNumbers.find((number) => number.kind === "pesel")?.value || numbersOf("pesel").find((n) => n.kind === "pesel")?.value || "";
    const nip = labelledNip || freeNumbers.find((number) => number.kind === "nip")?.value || "";
    const phone = labelledPhone || freeNumbers.find((number) => number.kind === "phone")?.value || "";

    // Name
    let name = "";
    let company = "";
    const companySegment = segments.find((segment) => ["name", "free"].includes(segment.kind) && COMPANY_SIGNAL.test(segment.value) && !/@/.test(segment.value));
    if (companySegment) company = companySegment.value.replace(/\s+/g, " ").trim();
    const first = segments.find((segment) => segment.kind === "firstName")?.value || "";
    const last = segments.find((segment) => segment.kind === "lastName")?.value || "";
    const reversedLabel = segments.find((segment) => segment.kind === "nameReversed" && segment.value);
    const labelled = segments.find((segment) => segment.kind === "name" && segment.value && !COMPANY_SIGNAL.test(segment.value));
    let usedName = "";
    if (first && last) {
      name = `${capitalizeWord(first.split(/\s+/)[0])} ${capitalizeWord(last.split(/\s+/)[0])}`;
    } else if (reversedLabel) {
      usedName = reversedLabel.value;
      name = twoWordName(reversedLabel.value, { reversed: true });
    } else if (labelled) {
      usedName = labelled.value;
      name = twoWordName(labelled.value);
    } else {
      const candidates = segments
        .filter((segment) => segment.kind === "free")
        .flatMap((segment, index) => nameCandidates(segment, index))
        .sort((a, b) => b.score - a.score);
      if (candidates[0]) {
        usedName = candidates[0].value;
        name = twoWordName(candidates[0].value);
      }
    }
    // A free line that started with the name and goes on with numbers:
    // "Piotr Mazur 79092600814 669050903".
    if (!name && !company) {
      const leading = segments.find((segment) => segment.kind === "free")?.value.match(/^([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){1,3})(?=\s+[+\d])/u);
      if (leading && leading[1].split(/\s+/).some(isFirstName)) {
        usedName = leading[1];
        name = twoWordName(leading[1]);
      }
    }

    const isCompany = Boolean(company) || (Boolean(nip) && !pesel);
    const address = recognizeAddress(segments, usedName);

    return {
      type: isCompany ? "company" : "person",
      name: isCompany ? company || name : name,
      address,
      pesel,
      nip,
      identifier: isCompany ? nip : pesel,
      phone,
      email,
    };
  }

  // "BMW X5, 2019, diesel": a line that starts with a car make is the vehicle
  // even without "Auto:" in front of it (contract pages, vehicle fields).
  function carMakeLine(text) {
    return (
      String(text || "")
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .find((line) => CAR_MAKES.has(fold(line.split(/[\s,;:]/)[0])) && !COMPANY_SIGNAL.test(line) && !/@/.test(line)) || ""
    );
  }

  return { recognizeClient, carMakeLine, twoWordName, normalizeStreet, peselChecksumValid, segmentize };
});
