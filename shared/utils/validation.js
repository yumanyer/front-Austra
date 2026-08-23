export function isValidAddress(address) {
  if (!isAvailable(address)) return false
  return /^0x[a-fA-F0-9]{40}$/.test(address) || /^0x[a-fA-F0-9]{64}$/.test(address)
}

export function isValidQuantity(value) {
  if (!isAvailable(value)) return false
  return !isNaN(Number(value)) && Number(value) >= 0
}

export function isValidPercentage(value) {
  if (!isAvailable(value)) return false
  return !isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100
}