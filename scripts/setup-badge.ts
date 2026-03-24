import * as p from "@clack/prompts";
import { AtpAgent } from "@atproto/api";
import { IdResolver } from "@atproto/identity";
import {
  generateSigningKeys,
  addAttestationVerificationMethod,
  findExistingBadgeDefinition,
  createBadgeDefinition,
  BADGE_DEFINITION_COLLECTION,
} from "@fujocoded/atproto-badge";
import { promptPushCredentials } from "./lib/auth";
import { readFileSync, appendFileSync, existsSync } from "node:fs";

const DRY_RUN = process.argv.includes("--dry-run");
const resolver = new IdResolver();

async function resolveIdentifierToDid(identifier: string): Promise<string> {
  if (identifier.startsWith("did:")) return identifier;
  const did = await resolver.handle.resolve(identifier);
  if (!did) throw new Error(`Could not resolve handle: ${identifier}`);
  return did;
}

async function resolvePds(identifier: string): Promise<string> {
  const did = await resolveIdentifierToDid(identifier);
  const data = await resolver.did.resolveAtprotoData(did);
  return data.pds;
}

// --- generate-key ---

function readEnvFile(): Record<string, string> {
  const path = ".env";
  if (!existsSync(path)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

function saveToEnv(key: string, value: string) {
  appendFileSync(".env", `\n${key}=${value}\n`, "utf8");
}

async function offerSaveToEnv(vars: Record<string, string>) {
  console.log("");
  for (const [key, value] of Object.entries(vars)) {
    console.log(`${key}=${value}`);
  }
  console.log("");

  if (DRY_RUN) {
    p.log.info("[dry run] Would save to .env");
    return;
  }

  const save = await p.confirm({
    message: "Save to .env?",
    initialValue: true,
  });
  if (!p.isCancel(save) && save) {
    for (const [key, value] of Object.entries(vars)) {
      saveToEnv(key, value);
    }
    p.log.success("Saved to .env");
  }
}

async function handleGenerateKey() {
  const env = readEnvFile();

  if (env.BADGE_SIGNING_KEY) {
    p.log.warn("BADGE_SIGNING_KEY already exists in .env");
    const overwrite = await p.confirm({
      message: "Generate a new key anyway? (The old key will NOT be removed automatically.)",
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Keeping existing key.");
      return;
    }
  }

  const { identifier, password } = await promptPushCredentials();

  const { privateKeyBase64url, publicDidKey } =
    await generateSigningKeys();

  p.log.info("Generated P-256 Keypair");
  p.log.info("Public key (for DID document #attestations verification method):");
  console.log(`\n${publicDidKey}\n`);

  await offerSaveToEnv({ BADGE_SIGNING_KEY: privateKeyBase64url });

  const updateNow = await p.confirm({
    message: "Add #attestations verification method to your DID document now?",
    initialValue: true,
  });
  if (!p.isCancel(updateNow) && updateNow) {
    await handleUpdateDid(publicDidKey, { identifier, password });
  } else {
    p.log.info(
      'Run this script again and select "update-did" when ready.',
    );
  }
}

// --- create-definition ---

async function handleCreateDefinition() {
  const { identifier, password } = await promptPushCredentials();

  const name = await p.text({
    message: "Badge name",
    placeholder: "ATmosphere Conference 2026 Attendee",
    validate: (v) => (v?.trim() ? undefined : "Name is required"),
  });
  if (p.isCancel(name)) {
    p.cancel("Cancelled.");
    return;
  }

  const description = await p.text({
    message: "Badge description (optional)",
    placeholder: "Awarded to attendees of ATmosphere Conference 2026",
  });
  if (p.isCancel(description)) {
    p.cancel("Cancelled.");
    return;
  }

  const s = p.spinner();
  s.start("Resolving identity");
  const pds = await resolvePds(identifier);
  const did = await resolveIdentifierToDid(identifier);
  s.stop(`Resolved: ${did}`);

  const agent = new AtpAgent({ service: pds });
  await agent.login({ identifier, password });

  // Check for existing definition
  const s2 = p.spinner();
  s2.start("Checking for existing badge definition");
  const existing = await findExistingBadgeDefinition({ agent, did, name });
  if (existing) {
    s2.stop("Found existing definition");
    p.log.info("Existing badge definition found.");
    await offerSaveToEnv({
      BADGE_DEFINITION_URI: existing.uri,
      BADGE_DEFINITION_CID: existing.cid,
    });
    return;
  }
  s2.stop("No existing definition found");

  const desc = description && !p.isCancel(description) ? description.trim() : undefined;

  if (DRY_RUN) {
    p.log.info(`[dry run] Would create badge definition "${name}"`);
    if (desc) p.log.info(`[dry run] Description: ${desc}`);
    p.log.info(`[dry run] Browse: https://pdsls.dev/at/${did}/${BADGE_DEFINITION_COLLECTION}`);
    return;
  }

  const s3 = p.spinner();
  s3.start("Creating badge definition");
  const data = await createBadgeDefinition({ agent, did, name, description: desc || undefined });
  s3.stop("Created");

  p.log.info(`Browse: https://pdsls.dev/at/${did}/${BADGE_DEFINITION_COLLECTION}`);
  await offerSaveToEnv({
    BADGE_DEFINITION_URI: data.uri,
    BADGE_DEFINITION_CID: data.cid,
  });
}

// --- update-did ---

async function handleUpdateDid(existingPublicKey?: string, credentials?: { identifier: string; password: string }) {
  let publicDidKey: string;
  if (existingPublicKey) {
    publicDidKey = existingPublicKey;
  } else {
    const input = await p.text({
      message: "Public key (did:key:...) from generate-key step",
      validate: (v) =>
        v?.trim().startsWith("did:key:") ? undefined : "Must be a did:key:...",
    });
    if (p.isCancel(input)) {
      p.cancel("Cancelled.");
      return;
    }
    publicDidKey = input;
  }

  const { identifier, password } = credentials ?? await promptPushCredentials();

  const s = p.spinner();
  s.start("Resolving identity and checking current DID document");
  const pds = await resolvePds(identifier);
  const did = await resolveIdentifierToDid(identifier);

  // Fetch current verification methods to show user what exists
  const logRes = await fetch(`https://plc.directory/${did}/log/audit`);
  if (!logRes.ok) throw new Error(`Failed to fetch PLC log: ${logRes.status}`);
  const operations = await logRes.json();
  const lastOp = operations[operations.length - 1]?.operation;
  if (!lastOp) throw new Error("No PLC operations found");
  s.stop(`Resolved: ${did}`);

  const currentMethods = lastOp.verificationMethods ?? {};
  const hasAttestation = "attestations" in currentMethods;

  if (hasAttestation) {
    p.note(
      [
        `Current #attestations key: ${currentMethods.attestations}`,
        "",
        "An #attestations verification method already exists.",
      ].join("\n"),
      "Already configured",
    );

    if (DRY_RUN) {
      p.log.info(`[dry run] Would overwrite #attestations key with ${publicDidKey.trim()}`);
      return;
    }

    const overwrite = await p.confirm({
      message: "Overwrite with new key?",
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Keeping existing key.");
      return;
    }
  }

  if (DRY_RUN) {
    p.log.info(`[dry run] Would add #attestations verification method to ${did}`);
    p.log.info(`[dry run] Key: ${publicDidKey.trim()}`);
    return;
  }

  const proceed = await p.confirm({
    message: "Proceed? This will send an email verification challenge.",
    initialValue: true,
  });
  if (p.isCancel(proceed) || !proceed) {
    p.cancel("Aborted.");
    return;
  }

  // Login to PDS
  const agent = new AtpAgent({ service: pds });
  await agent.login({ identifier, password });

  // Request email challenge
  const s2 = p.spinner();
  s2.start("Requesting PLC operation signature (check your email)");
  await agent.com.atproto.identity.requestPlcOperationSignature();
  s2.stop("Email sent");

  p.log.info("Check your email for the verification code.");

  const token = await p.text({
    message: "Enter the verification token from the email",
    validate: (v) => (v?.trim() ? undefined : "Token is required"),
  });
  if (p.isCancel(token)) {
    p.cancel("Cancelled.");
    return;
  }

  // Delegate the actual PLC update to atproto-badge
  const s3 = p.spinner();
  s3.start("Updating DID document");
  await addAttestationVerificationMethod({ agent, did, publicDidKey, token });
  s3.stop("DID document updated");

  p.log.success("DID Document Updated");
  console.log(`\n#attestations verification method added to ${did}`);
  console.log(`Key: ${publicDidKey.trim()}`);
  console.log(`Verify: https://plc.directory/${did}\n`);
}

// --- CLI ---

try {
  p.intro(`ATmosphere Badge Setup${DRY_RUN ? " (dry run)" : ""}`);

  const command = await p.select({
    message: "What would you like to do?",
    options: [
      {
        value: "generate-key",
        label: "Generate attestation keypair",
      },
      {
        value: "update-did",
        label: "Add #attestations verification method to DID document",
      },
      {
        value: "create-definition",
        label: "Create badge definition on PDS",
      },
    ],
  });
  if (p.isCancel(command)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  if (command === "generate-key") {
    await handleGenerateKey();
  } else if (command === "update-did") {
    await handleUpdateDid();
  } else {
    await handleCreateDefinition();
  }

  p.outro("Done!");
} catch (error) {
  p.log.error(String(error));
  process.exit(1);
}
