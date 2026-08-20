export function matchesGlob(filePath, pattern) {
  const normalizedPath = normalize(filePath);
  const normalizedPattern = normalize(pattern);
  const regex = new RegExp(`^${toRegex(normalizedPattern)}$`);
  return regex.test(normalizedPath);
}

export function matchesAny(filePath, patterns = []) {
  return patterns.some((pattern) => matchesGlob(filePath, pattern));
}

function normalize(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function toRegex(pattern) {
  let output = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    if (char === "*" && next === "*") {
      const slash = pattern[index + 2] === "/";
      output += slash ? "(?:.*/)?" : ".*";
      index += slash ? 2 : 1;
    } else if (char === "*") {
      output += "[^/]*";
    } else if (char === "?") {
      output += "[^/]";
    } else {
      output += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return output;
}
