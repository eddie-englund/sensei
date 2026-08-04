export function parseDecimalInput(value: string): number {
  return Number(value.replace(',', '.'))
}
