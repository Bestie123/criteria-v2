const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
  const baseDir = path.resolve(__dirname, '..');
  const ref2MasterPath = path.resolve(baseDir, '../ref2/_master-list.json');
  if (!fs.existsSync(ref2MasterPath)) {
    throw new Error(`ref2 master list not found: ${ref2MasterPath}`);
  }

  const ref2Master = JSON.parse(fs.readFileSync(ref2MasterPath, 'utf8'));
  if (!ref2Master.criteria || typeof ref2Master.criteria !== 'object') {
    throw new Error('ref2/_master-list.json: expected top-level "criteria" object');
  }

  const criteriaDir = path.join(baseDir, 'criteria');
  const categoriesDir = path.join(baseDir, 'categories');
  const detailsDir = path.join(baseDir, 'details');

  ensureDir(criteriaDir);
  ensureDir(categoriesDir);
  ensureDir(detailsDir);

  const ids = Object.keys(ref2Master.criteria).sort();
  for (const id of ids) {
    const entry = ref2Master.criteria[id];
    if (!entry || typeof entry !== 'object') continue;

    const canonical = {
      id,
      text: entry.text,
      categories: Array.isArray(entry.categories) ? entry.categories.slice() : [],
      tags: Array.isArray(entry.tags) ? entry.tags.slice() : [],
    };

    const outPath = path.join(criteriaDir, `${id}.json`);
    writeJson(outPath, canonical);
  }

  // Copy known detailed criterion files from ref2/details if present.
  // Keep ref3 naming simple: details/<id>.json
  const ref2DetailsDir = path.resolve(baseDir, '../ref2/details');
  if (fs.existsSync(ref2DetailsDir)) {
    const files = fs.readdirSync(ref2DetailsDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const m = f.match(/criteria-(\d{3})-detailed\.json$/);
      if (!m) continue;
      const id = m[1];
      const src = path.join(ref2DetailsDir, f);
      const dst = path.join(detailsDir, `${id}.json`);
      fs.copyFileSync(src, dst);
    }
  }

  console.log(`[bootstrap] created/updated ${ids.length} criteria files in ${criteriaDir}`);
  console.log(`[bootstrap] copied details to ${detailsDir}`);
}

main();
