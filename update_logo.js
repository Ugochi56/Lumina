const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace Navbar main logo (which varies slightly by file)
    // Example: <span class="text-2xl font-extrabold tracking-tight text-white hover:text-cayenne_red transition">Lumina</span>
    content = content.replace(
        /<span\s+class="text-2xl font-extrabold tracking-tight text-white[^>]*>Lumina<\/span>/g,
        '<img src="/images/logo.png" alt="Lumina Logo" class="h-6 w-auto invert brightness-0 hover:opacity-80 transition" style="filter: brightness(0) invert(1);">'
    );

    // Replace footer logos 
    // Example: <span class="text-2xl font-extrabold tracking-tight text-white">Lumina</span>
    content = content.replace(
        /<span\s+class="text-2xl font-extrabold tracking-tight text-white">Lumina<\/span>/g,
        '<img src="/images/logo.png" alt="Lumina Logo" class="h-5 w-auto invert brightness-0" style="filter: brightness(0) invert(1);">'
    );

    // Replace "Lumina <span>Web</span>" on login page specifically
    content = content.replace(
        />Lumina\s*<span\s+class="text-orange">Web<\/span>/gi,
        '><img src="/images/logo.png" alt="Lumina" class="h-6 w-auto invert brightness-0 inline-block mr-2" style="filter: brightness(0) invert(1);"> <span class="text-orange inline-block align-middle">Web</span>'
    );
    
    // Admin.html logo
    // <h1 class="font-display text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange to-pink-500">Lumina Command Center</h1>
    if (file === 'admin.html') {
         content = content.replace(
             /<h1 class="font-display text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange to-pink-500">Lumina Command Center<\/h1>/g,
             '<div class="flex items-center gap-3"><img src="/images/logo.png" alt="Lumina" class="h-8 w-auto invert brightness-0" style="filter: brightness(0) invert(1);"><h1 class="font-display text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange to-pink-500">Command Center</h1></div>'
         );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated logo in ${file}`);
});
