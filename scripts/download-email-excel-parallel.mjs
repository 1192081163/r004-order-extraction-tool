import { appendFile, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImapFlow } from 'imapflow';
import {
  DEFAULT_IMAP_PORT,
  DEFAULT_IMAP_SERVER,
  isExcelAttachmentName,
  sanitizeAttachmentName,
} from '../dist/core/emailSource.js';

const email = process.env.EMAIL;
const auth = process.env.AUTH;
const outDir = process.env.OUT;
const workers = Number.parseInt(process.env.WORKERS || '4', 10);
const chunkSize = Number.parseInt(process.env.CHUNK || '100', 10);
const year = process.env.YEAR;
const since = process.env.SINCE || (year ? `${year}-01-01T00:00:00Z` : '');
const before = process.env.BEFORE || (year ? `${Number.parseInt(year, 10) + 1}-01-01T00:00:00Z` : '');
const searchSince = since ? new Date(since) : null;
const searchBefore = before ? new Date(before) : null;

if (!email || !auth || !outDir) {
  console.error('Missing EMAIL, AUTH, or OUT environment variable.');
  process.exit(2);
}

if ((since && Number.isNaN(searchSince.getTime())) || (before && Number.isNaN(searchBefore.getTime()))) {
  console.error('Invalid SINCE, BEFORE, or YEAR date range.');
  process.exit(2);
}

await mkdir(outDir, { recursive: true });

const manifestPath = path.join(outDir, 'download_manifest.jsonl');
const summaryPath = path.join(outDir, 'download_summary.json');
const startedAt = new Date().toISOString();

const boxSlug = (value) =>
  value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'mailbox';

const partSlug = (value) => String(value).replace(/[^A-Za-z0-9_-]+/g, '_');

function findExcelParts(node, acc = []) {
  if (!node) return acc;

  const filename = node.dispositionParameters?.filename || node.parameters?.name || '';
  if (node.part && filename && isExcelAttachmentName(filename)) {
    acc.push({ part: node.part, filename });
  }

  for (const child of node.childNodes || []) {
    findExcelParts(child, acc);
  }

  return acc;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function newClient() {
  const client = new ImapFlow({
    host: DEFAULT_IMAP_SERVER,
    port: DEFAULT_IMAP_PORT,
    secure: true,
    auth: { user: email, pass: auth },
    logger: false,
  });

  await client.connect();
  return client;
}

async function discoverJobs() {
  const client = await newClient();
  const mailboxes = [];

  try {
    const boxes = await client.list();

    for (const box of boxes) {
      if (box.flags?.has?.('\\Noselect')) continue;

      try {
        const status = await client.status(box.path, {
          messages: true,
          unseen: true,
          uidNext: true,
        });
        const messages = status.messages || 0;
        const mailbox = {
          path: box.path,
          messages,
          unseen: status.unseen || 0,
          uidNext: status.uidNext || null,
        };

        if (searchSince || searchBefore) {
          await client.mailboxOpen(box.path);
          const query = { all: true };
          if (searchSince) query.since = searchSince;
          if (searchBefore) query.before = searchBefore;
          const uids = await client.search(query, { uid: true });
          mailbox.matchedMessages = uids.length;
          mailbox.uids = uids;
        }

        mailboxes.push(mailbox);
      } catch (error) {
        mailboxes.push({
          path: box.path,
          messages: 0,
          statusError: error?.message || String(error),
        });
      }
    }
  } finally {
    await client.logout().catch(() => undefined);
  }

  const jobs = [];
  for (const mailbox of mailboxes) {
    if (mailbox.uids) {
      for (let index = 0; index < mailbox.uids.length; index += chunkSize) {
        const uids = mailbox.uids.slice(index, index + chunkSize);
        jobs.push({
          mailbox: mailbox.path,
          uids,
          range: uids.join(','),
          label: `${uids[0]}:${uids[uids.length - 1]}`,
          uidMode: true,
        });
      }
      delete mailbox.uids;
    } else {
      if (!mailbox.messages) continue;
      for (let start = 1; start <= mailbox.messages; start += chunkSize) {
        const end = Math.min(mailbox.messages, start + chunkSize - 1);
        jobs.push({
          mailbox: mailbox.path,
          range: `${start}:${end}`,
          label: `${start}:${end}`,
          uidMode: false,
        });
      }
    }
  }

  return { mailboxes, jobs };
}

const { mailboxes, jobs } = await discoverJobs();

let totalScanned = 0;
let totalCandidates = 0;
let totalExcel = 0;
let totalSkippedExisting = 0;
let totalErrors = 0;
let completedJobs = 0;

console.log(
  JSON.stringify({
    phase: 'discovered',
    email,
    outDir,
    workers,
    chunkSize,
    searchSince: searchSince?.toISOString() || null,
    searchBefore: searchBefore?.toISOString() || null,
    mailboxes,
    jobs: jobs.length,
  }),
);

async function recordManifest(row) {
  await appendFile(manifestPath, `${JSON.stringify(row)}\n`);
}

async function runWorker(workerId) {
  const client = await newClient();

  try {
    while (jobs.length > 0) {
      const job = jobs.shift();
      const t0 = Date.now();
      let scanned = 0;
      let candidateParts = 0;
      let saved = 0;
      let skippedExisting = 0;
      const candidates = [];

      const lock = await client.getMailboxLock(job.mailbox);
      try {
        for await (const msg of client.fetch(
          job.range,
          { uid: true, bodyStructure: true, envelope: true },
          { uid: job.uidMode },
        )) {
          scanned += 1;
          const parts = findExcelParts(msg.bodyStructure);
          if (parts.length) {
            candidateParts += parts.length;
            candidates.push({
              seq: msg.seq,
              uid: msg.uid,
              envelope: msg.envelope,
              parts,
            });
          }
        }

        const t1 = Date.now();

        for (const item of candidates) {
          try {
            const downloaded = await client.downloadMany(
              String(item.uid),
              item.parts.map((part) => part.part),
              { uid: true },
            );

            for (const part of item.parts) {
              const got = downloaded[part.part];
              if (!got?.content) continue;

              const base = sanitizeAttachmentName(got.meta?.filename || part.filename);
              const filename = [
                boxSlug(job.mailbox),
                String(item.seq).padStart(6, '0'),
                String(item.uid).padStart(8, '0'),
                partSlug(part.part),
                base,
              ].join('-');
              const filePath = path.join(outDir, filename);

              if (await exists(filePath)) {
                skippedExisting += 1;
                continue;
              }

              await writeFile(filePath, got.content);
              saved += 1;

              await recordManifest({
                savedAt: new Date().toISOString(),
                mailbox: job.mailbox,
                seq: item.seq,
                uid: item.uid,
                part: part.part,
                originalFilename: got.meta?.filename || part.filename,
                savedFilename: filename,
                subject: item.envelope?.subject || '',
                date: item.envelope?.date || '',
              });
            }
          } catch (error) {
            totalErrors += 1;
            console.log(
              JSON.stringify({
                phase: 'download_error',
                workerId,
                mailbox: job.mailbox,
                uid: item.uid,
                error: error?.message || String(error),
              }),
            );
          }
        }

        totalScanned += scanned;
        totalCandidates += candidateParts;
        totalExcel += saved;
        totalSkippedExisting += skippedExisting;
        completedJobs += 1;

        console.log(
          JSON.stringify({
            phase: 'chunk',
            workerId,
            mailbox: job.mailbox,
            range: job.label,
            uidMode: job.uidMode,
            scanned,
            candidateMessages: candidates.length,
            candidateParts,
            saved,
            skippedExisting,
            structureMs: t1 - t0,
            downloadMs: Date.now() - t1,
            progress: {
              completedJobs,
              remainingJobs: jobs.length,
              totalScanned,
              totalCandidates,
              totalExcel,
              totalSkippedExisting,
              totalErrors,
            },
          }),
        );
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

await Promise.all(Array.from({ length: workers }, (_, index) => runWorker(index + 1)));

const summary = {
  email,
  downloadDir: outDir,
  startedAt,
  finishedAt: new Date().toISOString(),
  workers,
  chunkSize,
  searchSince: searchSince?.toISOString() || null,
  searchBefore: searchBefore?.toISOString() || null,
  scannedMessages: totalScanned,
  excelCandidateParts: totalCandidates,
  savedExcelAttachments: totalExcel,
  skippedExistingAttachments: totalSkippedExisting,
  totalErrors,
  mailboxes,
};

await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ phase: 'done', ...summary }, null, 2));
