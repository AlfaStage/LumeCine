function format(content: string): string {
  const arrayMatch = content.match(/(\w+)\s*=\s*\[(.*?)\]\s*;/s);
  const numberMatch = content.match(/(\d{7,})/);

  if (!arrayMatch || !numberMatch) {
    return '';
  }

  const [, , arrayValues] = arrayMatch;
  const dynamicNumber = Number.parseInt(numberMatch[1], 10);
  const base64Strings = arrayValues
    .split(',')
    .map((s) => s.trim().replace(/['"]/g, ''));

  let decodedString = '';

  for (const base64Str of base64Strings) {
    try {
      const decoded = Buffer.from(base64Str, 'base64').toString('binary');
      const numbersOnly = decoded.replace(/\D/g, '');
      const charCode = Number.parseInt(numbersOnly, 10) - dynamicNumber;

      decodedString += String.fromCharCode(charCode);
    } catch {}
  }

  try {
    return Buffer.from(decodedString, 'latin1').toString('utf8');
  } catch {
    return '';
  }
}

export function decrypt(script: string): string {
  const result: string[] = [];
  const content = String(script);
  const matches = content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of matches) {
    result.push(format(match[1]));
  }

  return result.join('\n');
}
