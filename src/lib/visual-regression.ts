function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function serializeForOrdering(value: unknown) {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function isVisualRegressionMode() {
  return process.env.PLAYWRIGHT === "1";
}

export function shuffleVisualStable<T>(items: T[]) {
  if (!isVisualRegressionMode()) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  return [...items].sort((left, right) => {
    const leftKey = serializeForOrdering(left);
    const rightKey = serializeForOrdering(right);
    const hashDiff = hashString(leftKey) - hashString(rightKey);

    return hashDiff || leftKey.localeCompare(rightKey);
  });
}
