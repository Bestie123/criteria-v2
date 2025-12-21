const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function isId(x) {
  return typeof x === 'string' && /^\d{3}$/.test(x);
}

function main() {
  const baseDir = path.resolve(__dirname, '..');
  const criteriaDir = path.join(baseDir, 'criteria');
  const categoriesDir = path.join(baseDir, 'categories');
  ensureDir(categoriesDir);

  const taxonomyPath = path.join(baseDir, 'taxonomy.json');
  if (!fs.existsSync(taxonomyPath)) {
    throw new Error(`taxonomy.json not found: ${taxonomyPath}`);
  }
  const taxonomy = readJson(taxonomyPath);

  const categoryKeys = Object.keys(taxonomy.categories || {});
  const categorySet = new Set(categoryKeys);
  if (categoryKeys.length === 0) {
    throw new Error('taxonomy.json: expected non-empty categories object');
  }

  if (!fs.existsSync(criteriaDir)) {
    throw new Error(`criteria dir not found: ${criteriaDir}`);
  }

  const files = fs.readdirSync(criteriaDir).filter((f) => f.endsWith('.json'));
  const criteria = [];
  for (const f of files) {
    const p = path.join(criteriaDir, f);
    const c = readJson(p);

    if (!isId(c.id)) {
      throw new Error(`Invalid id in ${p}: ${c.id}`);
    }
    if (typeof c.text !== 'string' || !c.text.trim()) {
      throw new Error(`Missing/empty text in ${p}`);
    }
    if (!Array.isArray(c.categories)) {
      throw new Error(`categories must be array in ${p}`);
    }
    if (!Array.isArray(c.tags)) {
      throw new Error(`tags must be array in ${p}`);
    }

    for (const cat of c.categories) {
      if (!categorySet.has(cat)) {
        throw new Error(`Unknown category '${cat}' in ${p}. Allowed: ${categoryKeys.join(', ')}`);
      }
    }

    criteria.push(c);
  }

  // Uniqueness
  const seen = new Set();
  for (const c of criteria) {
    if (seen.has(c.id)) {
      throw new Error(`Duplicate id across files: ${c.id}`);
    }
    seen.add(c.id);
  }

  // Deterministic order
  criteria.sort((a, b) => a.id.localeCompare(b.id));

  // Build master list (generated)
  const master = {
    version: '3.0',
    generated: true,
    source: 'ref3/criteria/*.json',
    total_criteria: criteria.length,
    description: 'Сгенерированный мастер-список критериев (редактировать нельзя; источник истины: ref3/criteria/)',
    criteria: {},
  };

  for (const c of criteria) {
    const categoriesInfo = c.categories
      .map((key) => {
        const meta = taxonomy.categories[key] || {};
        return {
          key,
          title: meta.title || meta.name || key,
          description: meta.description || '',
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));

    master.criteria[c.id] = {
      text: c.text,
      categories: c.categories.slice().sort(),
      tags: c.tags.slice().sort(),
      categories_info: categoriesInfo,
    };
  }

  writeJson(path.join(baseDir, '_master-list.json'), master);

  // Build per-category views (generated)
  for (const cat of categoryKeys) {
    const meta = taxonomy.categories[cat] || {};
    const inCat = criteria.filter((c) => c.categories.includes(cat));
    const out = {
      version: '3.0',
      generated: true,
      category: cat,
      name: meta.title || meta.name || cat,
      description: meta.description || '',
      criteria: inCat.map((c) => ({ id: c.id, text: c.text, tags: c.tags })),
    };
    writeJson(path.join(categoriesDir, `${cat}.json`), out);
  }

  // Stats
  const stats = {
    version: '3.0',
    generated: true,
    total: criteria.length,
    by_category: Object.fromEntries(categoryKeys.map((cat) => [cat, criteria.filter((c) => c.categories.includes(cat)).length])),
    max_id: criteria.length ? criteria[criteria.length - 1].id : null,
  };
  writeJson(path.join(baseDir, 'stats.json'), stats);

  console.log(`[build] OK. criteria=${criteria.length} categories=${categoryKeys.length}`);
}

main();
