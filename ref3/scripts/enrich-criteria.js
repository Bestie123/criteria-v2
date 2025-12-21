const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
  const baseDir = path.resolve(__dirname, '..');
  const taxonomyPath = path.join(baseDir, 'taxonomy.json');
  const criteriaDir = path.join(baseDir, 'criteria');

  if (!fs.existsSync(taxonomyPath)) {
    throw new Error(`taxonomy.json not found: ${taxonomyPath}`);
  }
  if (!fs.existsSync(criteriaDir)) {
    throw new Error(`criteria dir not found: ${criteriaDir}`);
  }

  const taxonomy = readJson(taxonomyPath);
  const categoriesMeta = taxonomy.categories || {};

  const files = fs.readdirSync(criteriaDir).filter((f) => f.endsWith('.json'));
  let updated = 0;

  for (const f of files) {
    const p = path.join(criteriaDir, f);
    const c = readJson(p);

    const cats = Array.isArray(c.categories) ? c.categories : [];
    const categoriesInfo = cats
      .map((key) => {
        const meta = categoriesMeta[key] || {};
        return {
          key,
          title: meta.title || meta.name || key,
          description: meta.description || '',
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));

    c.categories_info = categoriesInfo;
    writeJson(p, c);
    updated++;
  }

  console.log(`[enrich-criteria] updated ${updated} criteria files with categories_info`);
}

main();
