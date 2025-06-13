const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const svgPath = path.join(__dirname, '../assets/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
    for (const size of sizes) {
        const outputPath = path.join(__dirname, `../assets/icon${size}.png`);
        
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        
        console.log(`Generated ${size}x${size} icon at ${outputPath}`);
    }
}

generateIcons().catch(console.error); 