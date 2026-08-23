export function createElement(tag, className, textContent, attributes = {}) {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (textContent !== undefined) element.textContent = textContent
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
  return element
}

export function addClass(element, className) {
  element.classList.add(className)
}

export function removeClass(element, className) {
  element.classList.remove(className)
}

export function hasClass(element, className) {
  return element.classList.contains(className)
}

export function setAttribute(element, key, value) {
  element.setAttribute(key, value)
}

export function removeAttribute(element, key) {
  element.removeAttribute(key)
}

export function insertAfter(referenceNode, newNode) {
  reference.parentNode.insertBefore(newNode, referenceNode.nextSibling)
}

export function emptyNode(node) {
  node.innerHTML = ""
}

export function textContentSafe(node, text) {
  node.textContent = text
}