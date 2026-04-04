const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Premium', 'SSC_Frontend.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const pagesPath = path.join(__dirname, 'pages');
const componentsPath = path.join(__dirname, 'components', 'mission');

function toCamelCase(str) {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

config.screens.forEach(screen => {
    let folder = screen.route.includes('/premium/') ? 'premium' : 'mission';
    
    let componentName = toCamelCase(screen.screen_id);
    let filePath = path.join(pagesPath, folder, `${componentName}.tsx`);
    
    let componentsList = [];
    if (screen.components) componentsList.push(...screen.components);
    if (screen.sections) {
        screen.sections.forEach(section => {
            if (section.components) {
                componentsList.push(...section.components.map(c => typeof c === 'string' ? c : c.name));
            }
        });
    }

    let code = `import React from 'react';

/**
 * Purpose: ${screen.purpose}
 * Route: ${screen.route}
 */
export default function ${componentName}() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight">${componentName.replace(/([A-Z])/g, ' $1').trim()}</h1>
                    <p className="text-muted-foreground mt-2">${screen.purpose}</p>
                </header>

                <div className="grid gap-6 mt-8">
                    {/* Scaffolded Components */}
${componentsList.map(c => typeof c === 'string' ? `                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">${toCamelCase(c).replace(/([A-Z])/g, ' $1').trim()}</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for ${c}</p>
                    </div>` : `                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">${toCamelCase(c.name).replace(/([A-Z])/g, ' $1').trim()}</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for ${c.name}</p>
                    </div>`).join('\n')}
                </div>
            </div>
        </div>
    );
}
`;

    fs.writeFileSync(filePath, code);
    console.log(`Created ${filePath}`);
});

config.shared_components.forEach(comp => {
    let code = `import React from 'react';

export function ${comp.name}(props: any) {
    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-medium">${comp.name}</h4>
            <div className="text-xs text-muted-foreground mt-2">
                Fields: ${comp.fields ? comp.fields.join(', ') : 'none'}
            </div>
            ${comp.actions ? `<div className="flex gap-2 mt-4">
                ${comp.actions.map(action => `<button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">${action.replace(/_/g, ' ')}</button>`).join('\n                ')}
            </div>` : ''}
        </div>
    );
}
`;
    let filePath = path.join(componentsPath, `${comp.name}.tsx`);
    fs.writeFileSync(filePath, code);
    console.log(`Created ${filePath}`);
});
