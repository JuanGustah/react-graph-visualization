export function isCpfOrCnpj(document: string): boolean {
  return document.length === 14 || document.length === 11;
}
