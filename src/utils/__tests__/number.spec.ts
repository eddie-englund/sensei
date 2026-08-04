import { describe, expect, it } from 'vitest'
import { parseDecimalInput } from '../number'

describe('parseDecimalInput', () => {
  it('parses a dot-separated decimal', () => {
    expect(parseDecimalInput('135.5')).toBe(135.5)
  })

  it('parses a comma-separated decimal', () => {
    expect(parseDecimalInput('135,5')).toBe(135.5)
  })

  it('parses a plain integer', () => {
    expect(parseDecimalInput('135')).toBe(135)
  })

  it('returns NaN for invalid input', () => {
    expect(parseDecimalInput('abc')).toBeNaN()
  })
})
