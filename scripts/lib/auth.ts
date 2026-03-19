import * as p from "@clack/prompts";
import { readFileSync, appendFileSync, existsSync } from "node:fs";

function readEnvFile(): Record<string, string> {
  const path = ".env";
  if (!existsSync(path)) {
    return {};
  }

  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

export async function promptPushCredentials(): Promise<{
  identifier: string;
  password: string;
}> {
  const env = readEnvFile();

  const identifier = await p.text({
    message: "AT Protocol identifier (handle or DID)",
    initialValue: env.ATP_IDENTIFIER ?? "",
    validate: (v) => (v?.trim() ? undefined : "Identifier is required"),
  });
  if (p.isCancel(identifier)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const password = await p.password({
    message: "App password",
    validate: (v) => (v?.trim() ? undefined : "Password is required"),
  });
  if (p.isCancel(password)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  // Offer to save identifier (never password)
  if (env.ATP_IDENTIFIER !== identifier.trim()) {
    const save = await p.confirm({
      message: "Save identifier to .env for next time?",
      initialValue: true,
    });
    if (!p.isCancel(save) && save) {
      const line = `\nATP_IDENTIFIER=${identifier.trim()}\n`;
      appendFileSync(".env", line, "utf8");
      p.log.success("Saved ATP_IDENTIFIER to .env");
    }
  }

  return { identifier: identifier.trim(), password: password.trim() };
}

export async function promptPullDid(): Promise<string> {
  const env = readEnvFile();

  const did = await p.text({
    message: "DID to pull records from",
    initialValue: env.ATP_IDENTIFIER ?? env.ADMIN_DID ?? "",
    validate: (v) => (v?.trim() ? undefined : "DID is required"),
  });
  if (p.isCancel(did)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return did.trim();
}
