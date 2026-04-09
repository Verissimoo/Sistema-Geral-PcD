import fs from 'fs';

const files = [
  'src/pages/ContractorDetail.jsx',
  'src/pages/Contractors.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Goals.jsx',
  'src/pages/ProjectKanban.jsx',
  'src/pages/Rituals.jsx',
  'src/components/contractors/ContractorFormDialog.jsx',
  'src/components/kanban/ProjectFormDialog.jsx',
  'src/components/rituals/RitualFormDialog.jsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/import\s+\{\s*base44\s*\}\s+from\s+['"]@\/api\/base44Client['"];?/g, 'import { localClient } from "@/api/localClient";');
    content = content.replace(/\bbase44\b/g, 'localClient');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
  } else {
    console.log('Not found: ' + f);
  }
});
