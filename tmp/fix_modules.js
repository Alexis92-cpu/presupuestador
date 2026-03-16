const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'js');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Remove import statements
            content = content.replace(/^import\s+.*$/gm, '');
            // Replace `export const` with `const`
            content = content.replace(/export\s+const\s+/g, 'const ');
            // Replace `export class` with `class`
            content = content.replace(/export\s+class\s+/g, 'class ');
            fs.writeFileSync(fullPath, content);
        }
    }
}

processDir(jsDir);

// Update index.html
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const newScripts = `
    <!-- Scripts -->
    <script src="js/utils/store.js"></script>
    <script src="js/utils/ui.js"></script>
    <script src="js/services/supabaseApi.js"></script>
    <script src="js/modules/canvas-bg.js"></script>
    <script src="js/modules/auth.js"></script>
    <script src="js/modules/exchange.js"></script>
    <script src="js/modules/products.js"></script>
    <script src="js/modules/clients.js"></script>
    <script src="js/modules/users.js"></script>
    <script src="js/modules/budgets.js"></script>
    <script src="js/app.js"></script>
</body>`;

indexContent = indexContent.replace(/\s*<!-- Scripts -->\s*<script type="module" src="js\/app\.js"><\/script>\s*<\/body>/s, newScripts);
fs.writeFileSync(indexPath, indexContent);

console.log('Fixed modules for file:// compatibility');
